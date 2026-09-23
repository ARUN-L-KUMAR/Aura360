/**
 * Shared AI type definitions for Aura360
 *
 * All AI services in lib/ai/services/ use these shared types
 * so the layer is consistent and easy to extend.
 */

// ─── Models & Providers ───────────────────────────────────────────────────────

export type AIProvider = "gemini"

export type AIModel =
  | "gemini-flash-latest"
  | "gemini-3.5-flash"
  | "gemini-flash-lite-latest"
  | "gemini-2.5-flash"
  | "gemini-3.1-flash-lite-preview"
  | "gemini-2.5-flash-lite"
  | "gemini-3-flash-preview"
  | "gemini-3.1-flash-lite"

export const DEFAULT_MODEL: AIModel = "gemini-flash-latest"
export const FAST_MODEL: AIModel = "gemini-flash-latest"

export interface ModelOption {
  id: AIModel
  name: string
  latency: string
  badge?: string
  description: string
}

export const CHAT_MODELS: ModelOption[] = [
  {
    id: "gemini-flash-latest",
    name: "Gemini Flash Latest",
    latency: "820ms",
    badge: "Fastest",
    description: "Ultra-fast response time, ideal for real-time conversation",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    latency: "956ms",
    badge: "Smart & Fast",
    description: "Next-gen reasoning speed & accuracy",
  },
  {
    id: "gemini-flash-lite-latest",
    name: "Gemini Flash-Lite Latest",
    latency: "1038ms",
    badge: "Lightweight",
    description: "High-efficiency lightweight model",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    latency: "1181ms",
    badge: "Stable",
    description: "Proven multi-turn assistant performance",
  },
  {
    id: "gemini-3.1-flash-lite-preview",
    name: "Gemini 3.1 Flash Lite Preview",
    latency: "1542ms",
    badge: "Preview",
    description: "Cutting-edge preview with fast response times",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    latency: "1902ms",
    badge: "Lite",
    description: "Compact & balanced for light prompts",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    latency: "2621ms",
    badge: "Preview",
    description: "Advanced intelligence & deep contextual reasoning",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    latency: "6705ms",
    badge: "Lite",
    description: "Full capability lightweight flash instance",
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

export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface AIRequest {
  prompt?: string
  messages?: ChatMessage[]
  systemPrompt?: string
  model?: AIModel
  config?: GenerationConfig
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
