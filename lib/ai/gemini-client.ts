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
  type AIInlineData,
  type GenerationConfig,
  type AiToolDeclaration,
  type AiFunctionCall,
  type AiGenerateResult,
  GeminiApiError,
  GeminiRateLimitError,
  GeminiTimeoutError,
} from "./types"

export type GeminiInput = {
  prompt?: string
  messages?: ChatMessage[]
  systemPrompt?: string
  inlineData?: AIInlineData
  tools?: AiToolDeclaration[]
}

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
  input: GeminiInput,
  config: GenerationConfig
): object {
  // Build contents array
  const contents: { role: string; parts: any[] }[] = []

  if (input.inlineData) {
    const parts: any[] = [{ inlineData: input.inlineData }]
    if (input.prompt) {
      parts.push({ text: input.prompt })
    }
    contents.push({ role: "user", parts })
  } else if (input.messages && input.messages.length > 0) {
    for (const msg of input.messages) {
      if (msg.parts && msg.parts.length > 0) {
        contents.push({
          role: msg.role === "function" ? "user" : msg.role,
          parts: msg.parts,
        })
      } else if (msg.role === "function" && msg.functionResponse) {
        contents.push({
          role: "user",
          parts: [{ functionResponse: msg.functionResponse }],
        })
      } else if (msg.functionCall) {
        contents.push({
          role: "model",
          parts: [{ functionCall: msg.functionCall }],
        })
      } else {
        contents.push({
          role: msg.role,
          parts: [{ text: msg.content ?? "" }],
        })
      }
    }
  } else if (input.prompt) {
    contents.push({ role: "user", parts: [{ text: input.prompt }] })
  }

  const body: Record<string, unknown> = { contents }

  // System instruction (Gemini v1beta supports systemInstruction)
  if (input.systemPrompt) {
    body.systemInstruction = { parts: [{ text: input.systemPrompt }] }
  }

  if (input.tools && input.tools.length > 0) {
    body.tools = [{ functionDeclarations: input.tools }]
    body.toolConfig = { functionCallingConfig: { mode: "AUTO" } }
  }

  body.generationConfig = {
    temperature: config.temperature ?? 0.7,
    maxOutputTokens: config.maxOutputTokens ?? 4096,
    ...(config.jsonMode ? { responseMimeType: "application/json" } : {}),
    thinkingConfig: { thinkingBudget: 0 },
  }

  return body
}

function extractResult(body: Record<string, unknown>): { text?: string; functionCall?: AiFunctionCall; rawParts?: any[] } {
  const candidate = (body as any)?.candidates?.[0]
  if (!candidate) {
    throw new GeminiApiError("No candidate received from Gemini")
  }

  const parts = candidate?.content?.parts
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new GeminiApiError("Empty or malformed Gemini response")
  }

  const fnPart = parts.find((p: any) => p.functionCall)
  if (fnPart?.functionCall) {
    return {
      functionCall: {
        name: fnPart.functionCall.name,
        args: (fnPart.functionCall.args as Record<string, unknown>) ?? {},
      },
      rawParts: parts,
    }
  }

  const text = parts
    .map((p: any) => p.text || "")
    .filter(Boolean)
    .join("")

  if (!text) {
    throw new GeminiApiError("Empty text in Gemini response")
  }

  return { text, rawParts: parts }
}

function extractText(body: Record<string, unknown>): string {
  const result = extractResult(body)
  if (!result.text) {
    throw new GeminiApiError("Expected text response from Gemini, got function call")
  }
  return result.text
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

const FALLBACK_CANDIDATES: Record<string, AIModel[]> = {
  "gemini-flash-latest": ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-3-flash-preview"],
  "gemini-3.5-flash": ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3-flash-preview"],
  "gemini-flash-lite-latest": ["gemini-flash-latest", "gemini-2.5-flash"],
  "gemini-2.5-flash": ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3-flash-preview"],
  "gemini-3.1-flash-lite-preview": ["gemini-flash-latest", "gemini-2.5-flash"],
  "gemini-2.5-flash-lite": ["gemini-flash-latest", "gemini-2.5-flash"],
  "gemini-3-flash-preview": ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash"],
  "gemini-3.1-flash-lite": ["gemini-flash-latest", "gemini-2.5-flash"],
}

async function callGeminiSingleRaw(
  model: AIModel,
  input: GeminiInput,
  config: GenerationConfig
): Promise<{ body: Record<string, unknown>; usage: AIUsageMetadata }> {
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

      // Handle rate limits (429) or high-demand capacity (503)
      if (res.status === 429 || res.status === 503) {
        lastError = new GeminiApiError(
          res.status === 429 ? "Rate limit reached" : `Model ${model} is experiencing high demand (503)`,
          res.status
        )
        // Fail fast on 429 to immediately try active fallback model
        break
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => "")
        throw new GeminiApiError(`Gemini API error ${res.status}: ${errText}`, res.status)
      }

      const responseBody = (await res.json()) as Record<string, unknown>
      const usage = extractUsage(responseBody, model, latencyMs)

      return { body: responseBody, usage }
    } catch (err) {
      if (err instanceof GeminiApiError) {
        if (err.statusCode !== 429 && err.statusCode !== 503) throw err
        lastError = err
      } else if (err instanceof Error && err.name === "TimeoutError") {
        lastError = new GeminiTimeoutError()
        if (attempt < MAX_RETRIES) await sleep(400 * attempt)
      } else if (err instanceof Error) {
        lastError = new GeminiApiError(err.message)
        if (attempt < MAX_RETRIES) await sleep(400 * attempt)
      }
    }
  }

  throw lastError
}

async function callGeminiCore(
  model: AIModel,
  input: GeminiInput,
  config: GenerationConfig
): Promise<{ body: Record<string, unknown>; usage: AIUsageMetadata }> {
  const modelsToTry = Array.from(new Set([model, ...(FALLBACK_CANDIDATES[model] || ["gemini-3.6-flash", "gemini-3-flash-preview"])]))
  let lastError: Error = new GeminiApiError("No response from Gemini models")

  for (const candidate of modelsToTry) {
    try {
      return await callGeminiSingleRaw(candidate, input, config)
    } catch (err: any) {
      lastError = err
      console.warn(`[GeminiClient] Model ${candidate} unavailable (${err.message}), checking fallback...`)
    }
  }

  throw lastError
}

async function callGemini(
  model: AIModel,
  input: GeminiInput,
  config: GenerationConfig
): Promise<{ text: string; usage: AIUsageMetadata }> {
  const { body, usage } = await callGeminiCore(model, input, config)
  const text = extractText(body)
  return { text, usage }
}

async function callGeminiWithTools(
  model: AIModel,
  input: GeminiInput,
  config: GenerationConfig
): Promise<AiGenerateResult> {
  const { body, usage } = await callGeminiCore(model, input, config)
  const result = extractResult(body)
  return {
    text: result.text,
    functionCall: result.functionCall,
    rawParts: result.rawParts,
    usage,
  }
}

// ─── Public Client API ────────────────────────────────────────────────────────

export class GeminiClient {
  private readonly defaultModel: AIModel

  constructor(defaultModel: AIModel = DEFAULT_MODEL) {
    this.defaultModel = defaultModel
  }

  /**
   * Generate a plain-text response from a single prompt, chat messages, or multimodal image.
   */
  async generateText(
    input: GeminiInput,
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
    input: GeminiInput,
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
   * Generate a response with function-calling support.
   */
  async generateWithTools(
    input: GeminiInput,
    options: {
      model?: AIModel
      config?: GenerationConfig
    } = {}
  ): Promise<AiGenerateResult> {
    const model = options.model ?? this.defaultModel
    const config = options.config ?? {}
    return callGeminiWithTools(model, input, config)
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
