/**
 * Finance Module Types
 * Matches the database schema from lib/db/schema.ts
 */

export type TransactionType = 'income' | 'expense' | 'investment' | 'transfer'

export interface Transaction {
  id: string
  workspaceId: string
  userId: string
  date: string | Date
  type: TransactionType
  category: string
  amount: string | number // decimal is returned as string
  description: string
  paymentMethod?: "cash" | "card" | "upi" | "bank_transfer" | "other" | null
  notes?: string | null
  needsReview: boolean
  tags?: string[] | null
  attachments?: string[] | null
  metadata?: Record<string, any> | null
  createdAt: Date | string
  updatedAt: Date | string
}

export interface BalanceData {
  id: string | null
  workspaceId: string
  userId: string
  cashBalance: number
  accountBalance: number
  realBalance: number
  expectedBalance: number
  difference: number
  updatedAt: string | Date | null
}

// Legacy interface for backward compatibility with excel upload
export interface FinanceTransaction {
  id?: string
  user_id?: string
  type: TransactionType
  amount: number
  category: string
  date: string // YYYY-MM-DD format
  description: string
  payment_method?: string | null
  notes?: string | null
  needs_review?: boolean
  created_at?: string
  updated_at?: string
}

export interface ParsedExcelRow extends FinanceTransaction {
  rowIndex: number
  isValid: boolean
  validationErrors: string[]
}

export interface ExcelColumnMapping {
  type?: number
  amount?: number
  category?: number
  date?: number
  description?: number
  payment_method?: number
  notes?: number
}

export interface ValidationError {
  field: string
  message: string
}

export interface BulkImportResult {
  success: boolean
  imported: number
  failed: number
  errors?: Array<{ row: number; error: string }>
}
