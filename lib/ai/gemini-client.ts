/**
 * Aura360 Shared Gemini Client
 *
 * Single point of contact for all Gemini API calls.
 * Features:
 *  - Typed generateText() and generateJson<T>() helpers
 *  - Exponential-backoff retry (up to 3 attempts)
 *  - Per-request AbortSignal timeout (default 15 s)
 *  - Latency + token usage tracking
 *  - Typed error classes (GeminiApiError, GeminiRateLimitError, GeminiTimeoutError)
 */

import {
  DEFAULT_MODEL,
  type AIModel,
  type AIUsageMetadata,
  type ChatMessage,
  type GenerationConfig,
  GeminiApiError,
  GeminiRateLimitError,
  GeminiTimeoutError,
} from "./types"

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_TIMEOUT_MS = 15_000
const MAX_RETRIES = 3

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildEndpoint(model: AIModel): string {
  const key = process.env.GEMINI_API_KEY ?? ""
  return `${BASE_URL}/${model}:generateContent?key=${key}`
}

function buildBody(
  input: {
    prompt?: string
    messages?: ChatMessage[]
    systemPrompt?: string
  },
  config: GenerationConfig
): object {
  // Build contents array
  const contents: { role: string; parts: { text: string }[] }[] = []

  if (input.messages && input.messages.length > 0) {
    for (const msg of input.messages) {
      contents.push({ role: msg.role, parts: [{ text: msg.content }] })
    }
  } else if (input.prompt) {
    contents.push({ role: "user", parts: [{ text: input.prompt }] })
  }

  const body: Record<string, unknown> = { contents }

  // System instruction (Gemini v1beta supports systemInstruction)
  if (input.systemPrompt) {
    body.systemInstruction = { parts: [{ text: input.systemPrompt }] }
  }

  body.generationConfig = {
    temperature: config.temperature ?? 0,
    maxOutputTokens: config.maxOutputTokens ?? 1024,
    ...(config.jsonMode ? { responseMimeType: "application/json" } : {}),
  }

  return body
}

function extractText(body: Record<string, unknown>): string {
  const raw = (body as any)?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof raw !== "string") throw new GeminiApiError("Empty or malformed Gemini response")
  return raw
}

function extractUsage(
  body: Record<string, unknown>,
  model: AIModel,
  latencyMs: number
): AIUsageMetadata {
  const meta = (body as any)?.usageMetadata ?? {}
  return {
    promptTokens: meta.promptTokenCount ?? 0,
    completionTokens: meta.candidatesTokenCount ?? 0,
    totalTokens: meta.totalTokenCount ?? 0,
    latencyMs,
    model,
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Core fetch with retry ────────────────────────────────────────────────────

async function callGemini(
  model: AIModel,
  input: {
    prompt?: string
    messages?: ChatMessage[]
    systemPrompt?: string
  },
  config: GenerationConfig
): Promise<{ text: string; usage: AIUsageMetadata }> {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    throw new GeminiApiError("GEMINI_API_KEY is not configured")
  }

  const endpoint = buildEndpoint(model)
  const body = buildBody(input, config)
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  let lastError: Error = new GeminiApiError("Unknown error")

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const startAt = Date.now()

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      })

      const latencyMs = Date.now() - startAt

      if (res.status === 429) {
        lastError = new GeminiRateLimitError()
        // Exponential backoff before retrying
        if (attempt < MAX_RETRIES) await sleep(500 * 2 ** attempt)
        continue
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new GeminiApiError(`Gemini API error ${res.status}: ${errText}`, res.status)
      }

      const responseBody = (await res.json()) as Record<string, unknown>
      const text = extractText(responseBody)
      const usage = extractUsage(responseBody, model, latencyMs)

      return { text, usage }
    } catch (err) {
      if (err instanceof GeminiApiError) {
        // Non-retriable (anything except rate-limit)
        if (!(err instanceof GeminiRateLimitError)) throw err
        lastError = err
      } else if (err instanceof Error && err.name === "TimeoutError") {
        lastError = new GeminiTimeoutError()
        if (attempt < MAX_RETRIES) await sleep(300 * attempt)
      } else if (err instanceof Error) {
        lastError = new GeminiApiError(err.message)
        if (attempt < MAX_RETRIES) await sleep(300 * attempt)
      }
    }
  }

  throw lastError
}

// ─── Public Client API ────────────────────────────────────────────────────────

export class GeminiClient {
  private readonly defaultModel: AIModel

  constructor(defaultModel: AIModel = DEFAULT_MODEL) {
    this.defaultModel = defaultModel
  }

  /**
   * Generate a plain-text response from a single prompt or a chat message array.
   */
  async generateText(
    input: {
      prompt?: string
      messages?: ChatMessage[]
      systemPrompt?: string
    },
    options: {
      model?: AIModel
      config?: GenerationConfig
    } = {}
  ): Promise<{ text: string; usage: AIUsageMetadata }> {
    const model = options.model ?? this.defaultModel
    const config = options.config ?? {}
    return callGemini(model, input, config)
  }

  /**
   * Generate a typed JSON response.
   * Automatically enables JSON mode and parses the output.
   */
  async generateJson<T>(
    input: {
      prompt?: string
      messages?: ChatMessage[]
      systemPrompt?: string
    },
    options: {
      model?: AIModel
      config?: GenerationConfig
    } = {}
  ): Promise<{ data: T; usage: AIUsageMetadata }> {
    const model = options.model ?? this.defaultModel
    const config: GenerationConfig = {
      ...options.config,
      jsonMode: true,
    }

    const { text, usage } = await callGemini(model, input, config)

    try {
      const data = JSON.parse(text) as T
      return { data, usage }
    } catch {
      throw new GeminiApiError(`Gemini returned invalid JSON: ${text.substring(0, 200)}`)
    }
  }

  /**
   * Returns true if a GEMINI_API_KEY is configured.
   */
  isAvailable(): boolean {
    const key = process.env.GEMINI_API_KEY ?? ""
    return key.length > 0 && key !== "your_gemini_api_key_here"
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const geminiClient = new GeminiClient()
