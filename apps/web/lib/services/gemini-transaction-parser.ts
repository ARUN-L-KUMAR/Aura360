/**
 * @deprecated Backward-compatibility re-export.
 *
 * All logic has moved to lib/ai/services/transaction-parser.ts
 * which uses the shared GeminiClient with retry and timeout handling.
 *
 * New code should import from "@/lib/ai" or "@/lib/ai/services/transaction-parser".
 */

export type { ParsedTransaction } from "@/lib/ai/services/transaction-parser"

export { parseTransactionText } from "@/lib/ai/services/transaction-parser"
