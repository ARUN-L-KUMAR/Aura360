// Finance Transaction Types

export type TransactionType = 'income' | 'expense' | 'investment' | 'transfer'

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
