/**
 * Shared AI type definitions for Aura360
 *
 * All AI services in lib/ai/services/ use these shared types
 * so the layer is consistent and easy to extend.
 */

// ─── Models & Providers ───────────────────────────────────────────────────────

export type AIProvider = "gemini" | "openai" | "groq"

export type AIModel =
  // Groq Models
  | "openai/gpt-oss-120b"
  | "qwen/qwen3.8-27b"
  // OpenAI Models
  | "gpt-4o-mini"
  | "gpt-4o"
  | "gpt-4.1-mini"
  | "gpt-4.1-nano"
  | "gpt-4.1"
  | "gpt-5-chat-latest"
  | "gpt-4-turbo"
  | "gpt-4"
  | "gpt-3.5-turbo"
  // Gemini Models
  | "gemini-3.6-flash"
  | "gemini-3-flash-preview"
  | "gemini-flash-latest"
  | "gemini-3.5-flash"
  | "gemini-2.5-flash"
  | "gemini-3.1-flash-lite-preview"
  | "gemini-2.5-flash-lite"
  | "gemini-3.1-flash-lite"
  | "gemini-flash-lite-latest"

export const DEFAULT_MODEL: AIModel = "gemini-3.6-flash"
export const FAST_MODEL: AIModel = "gemini-3.6-flash"

export interface ModelOption {
  id: AIModel
  name: string
  provider: AIProvider
  latency: string
  badge?: string
  description: string
}

export function getProviderForModel(model: AIModel | string): AIProvider {
  if (model.startsWith("qwen/") || model.startsWith("openai/gpt-oss")) {
    return "groq"
  }
  if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) {
    return "openai"
  }
  return "gemini"
}

export const CHAT_MODELS: ModelOption[] = [
  // ─── Groq Models ───
  {
    id: "openai/gpt-oss-120b",
    name: "GPT-OSS 120B",
    provider: "groq",
    latency: "320ms",
    badge: "120B Reasoning",
    description: "120B deep reasoning model running on Groq LPUs",
  },
  {
    id: "qwen/qwen3.8-27b",
    name: "Qwen 3.8 27B",
    provider: "groq",
    latency: "210ms",
    badge: "Ultra Fast",
    description: "Sub-300ms high-speed reasoning & tool calling on Groq LPUs",
  },

  // ─── OpenAI Models ───
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    latency: "450ms",
    badge: "OpenAI Top Pick",
    description: "Fast, accurate tool calling & affordable high-rate performance",
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    latency: "720ms",
    badge: "Flagship",
    description: "Top-tier multi-step reasoning across all 12 modules",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    latency: "420ms",
    badge: "Preview",
    description: "Next-gen compact reasoning model",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    provider: "openai",
    latency: "280ms",
    badge: "Ultra Light",
    description: "High-efficiency lightweight reasoning model",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    provider: "openai",
    latency: "680ms",
    badge: "Preview",
    description: "Next-generation frontier reasoning",
  },
  {
    id: "gpt-5-chat-latest",
    name: "GPT-5 Chat Latest",
    provider: "openai",
    latency: "800ms",
    badge: "Next Gen",
    description: "Latest generation flagship conversational intelligence",
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    latency: "1100ms",
    description: "Proven high-context performance",
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    latency: "400ms",
    description: "Legacy high-speed conversation",
  },

  // ─── Google Gemini Models ───
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    provider: "gemini",
    latency: "680ms",
    badge: "Gemini Top Pick",
    description: "High speed, high quota, and full tool reasoning support",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    provider: "gemini",
    latency: "820ms",
    badge: "Smart & Fast",
    description: "Advanced intelligence & deep contextual reasoning",
  },
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    provider: "gemini",
    latency: "820ms",
    badge: "Fastest",
    description: "Ultra-fast response time, ideal for real-time conversation",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "gemini",
    latency: "956ms",
    description: "Next-gen reasoning speed & accuracy",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "gemini",
    latency: "1180ms",
    description: "Proven multi-turn assistant performance",
  },
]

// ─── Generation Config ────────────────────────────────────────────────────────

export interface GenerationConfig {
  /** Sampling temperature. 0 = deterministic, 1 = creative. Default: 0 */
  temperature?: number
  /** Max tokens to generate. Default: 1024 */
  maxOutputTokens?: number
  /** Force JSON output. Default: false */
  jsonMode?: boolean
  /** Timeout in ms. Default: 15000 */
  timeoutMs?: number
}

// ─── Request / Response ───────────────────────────────────────────────────────

export interface AiToolDeclaration {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface AiFunctionCall {
  name: string
  args: Record<string, unknown>
}

export interface AiFunctionResponse {
  name: string
  response: Record<string, unknown>
}

export interface PendingAction {
  tool: string
  args: Record<string, any>
  summary: string
}

export interface AiGenerateResult {
  text?: string
  functionCall?: AiFunctionCall
  rawParts?: any[]
  pendingAction?: PendingAction
  usage: AIUsageMetadata
}

export interface ChatMessage {
  role: "user" | "model" | "function"
  content?: string
  functionCall?: AiFunctionCall
  functionResponse?: AiFunctionResponse
  parts?: any[]
}

export interface AIInlineData {
  mimeType: string
  data: string // base64 encoded data
}

export interface AIRequest {
  prompt?: string
  messages?: ChatMessage[]
  systemPrompt?: string
  inlineData?: AIInlineData
  model?: AIModel
  config?: GenerationConfig
  tools?: AiToolDeclaration[]
}

export interface AIUsageMetadata {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** Wall-clock latency in milliseconds */
  latencyMs: number
  model: AIModel
}

export interface AIResponse<T = string> {
  data: T
  usage: AIUsageMetadata
  /** Which service produced this response */
  service: AIServiceName
  /** Whether the response came from an AI model or a rule-based fallback */
  source: "ai" | "fallback"
}

// ─── Service Names ────────────────────────────────────────────────────────────

export type AIServiceName =
  | "link_enricher"
  | "transaction_parser"
  | "journal_assistant"
  | "insights_generator"
  | "smart_search"
  | "agent_orchestrator"

// ─── Insight Types ────────────────────────────────────────────────────────────

export type InsightSeverity = "info" | "tip" | "warning" | "success"

export type InsightModule = "finance" | "fitness" | "food"

export interface Insight {
  id: string
  module: InsightModule
  title: string
  description: string
  severity: InsightSeverity
  /** Optional action label shown in UI */
  actionLabel?: string
  /** Optional relative URL for the action */
  actionUrl?: string
}

// ─── Search Types ─────────────────────────────────────────────────────────────

export interface SearchCandidate {
  id: string
  title: string
  description?: string | null
  module: string
  tags?: string[]
}

export interface RankedResult extends SearchCandidate {
  /** 0.0–1.0 relevance score */
  score: number
  /** Short AI-generated explanation of why this result is relevant */
  reason?: string
}

// ─── Error Types ──────────────────────────────────────────────────────────────

export class GeminiApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message)
    this.name = "GeminiApiError"
  }
}

export class GeminiRateLimitError extends GeminiApiError {
  constructor(message = "Gemini rate limit exceeded (429)") {
    super(message, 429)
    this.name = "GeminiRateLimitError"
  }
}

export class GeminiTimeoutError extends GeminiApiError {
  constructor(message = "Gemini request timed out") {
    super(message)
    this.name = "GeminiTimeoutError"
  }
}
