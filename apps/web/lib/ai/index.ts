/**
 * Aura360 AI Layer — barrel export
 *
 * Import everything AI-related from here:
 *   import { geminiClient, journalAssistant, insightsGenerator } from "@/lib/ai"
 */

// Core client
export { geminiClient, GeminiClient } from "./gemini-client"

// Types
export * from "./types"

// Services
export { enrichLink } from "./services/link-enricher"
export { parseTransactionText } from "./services/transaction-parser"
export { journalAssistant } from "./services/journal-assistant"
export { insightsGenerator } from "./services/insights-generator"
export { smartSearch } from "./services/smart-search"
