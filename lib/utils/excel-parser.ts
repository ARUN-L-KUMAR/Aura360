import * as XLSX from 'xlsx'
import type { 
  FinanceTransaction, 
  ParsedExcelRow, 
  ExcelColumnMapping,
  TransactionType 
} from '@/lib/types/finance'

/**
 * Common column name variations for auto-mapping
 */
const COLUMN_MAPPINGS = {
  type: ['type', 'transaction type', 'category type', 'trans type', 'kind'],
  amount: ['amount', 'value', 'sum', 'total', 'spent', 'expense', 'income', 'debit', 'credit', 'price', 'cost'],
  category: ['category', 'cat', 'group', 'tag', 'label', 'classification'],
  date: ['date', 'transaction date', 'trans date', 'day', 'timestamp', 'when', 'time'],
  description: ['description', 'desc', 'details', 'note', 'notes', 'memo', 'narration', 'particulars', 'remark'],
  payment_method: ['payment method', 'payment', 'method', 'mode', 'payment mode', 'paid via', 'paid by'],
}

/**
 * Type keywords for auto-detection
 */
const TYPE_KEYWORDS = {
  expense: ['expense', 'spent', 'debit', 'payment', 'paid', 'out', 'withdrawal', 'spended'],
  income: ['income', 'credit', 'received', 'earned', 'salary', 'received amount', 'kudatha'],
  investment: ['investment', 'invest', 'stock', 'mutual fund', 'emi', 'loan'],
  transfer: ['transfer', 'moved', 'shifted']
}

/**
 * Parse Excel file and return JSON data
 */
export function parseExcelFile(file: File): Promise<ParsedExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          defval: ''
        })
        
        if (jsonData.length === 0) {
          reject(new Error('Excel file is empty'))
          return
        }
        
        // Auto-detect column mapping
        const columnMapping = detectColumnMapping(Object.keys(jsonData[0]))
        
        // Parse and validate each row
        const parsedData = jsonData.map((row, index) => 
          parseRow(row, index, columnMapping)
        )
        
        resolve(parsedData)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsBinaryString(file)
  })
}

/**
 * Auto-detect column mapping from headers
 */
function detectColumnMapping(headers: string[]): ExcelColumnMapping {
  const mapping: ExcelColumnMapping = {}
  
  headers.forEach((header, index) => {
    const normalizedHeader = header.toLowerCase().trim()
    
    // Check each field type
    Object.entries(COLUMN_MAPPINGS).forEach(([field, variations]) => {
      if (variations.some(v => normalizedHeader.includes(v))) {
        mapping[field as keyof ExcelColumnMapping] = index
      }
    })
  })
  
  return mapping
}

/**
 * Parse a single row from Excel
 */
function parseRow(
  row: any, 
  index: number, 
  mapping: ExcelColumnMapping
): ParsedExcelRow {
  const headers = Object.keys(row)
  const validationErrors: string[] = []
  
  // Extract values using column mapping or by column name
  const type = extractType(row, headers, mapping)
  const amount = extractAmount(row, headers, mapping)
  const category = extractCategory(row, headers, mapping)
  const date = extractDate(row, headers, mapping)
  const description = extractDescription(row, headers, mapping)
  const payment_method = extractPaymentMethod(row, headers, mapping)
  
  // Validate required fields
  if (!type) {
    validationErrors.push('Type is required (income/expense/investment)')
  }
  
  if (!amount || isNaN(amount) || amount <= 0) {
    validationErrors.push('Amount must be greater than 0')
  }
  
  if (!category || category.trim() === '') {
    validationErrors.push('Category is required')
  }
  
  if (!date || !isValidDate(date)) {
    validationErrors.push('Invalid date format')
  }
  
  return {
    rowIndex: index + 2, // +2 because Excel is 1-indexed and has header row
    type: type || 'expense',
    amount: amount || 0,
    category: category || '',
    date: date || '',
    description: description || '',
    payment_method: payment_method || null,
    notes: null,
    needs_review: validationErrors.length > 0,
    isValid: validationErrors.length === 0,
    validationErrors
  }
}

/**
 * Extract and normalize transaction type
 */
function extractType(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): TransactionType | null {
  let value = ''
  
  if (mapping.type !== undefined) {
    value = String(row[headers[mapping.type]] || '').toLowerCase().trim()
  } else {
    // Try to find type column by name
    const typeHeader = headers.find(h => 
      COLUMN_MAPPINGS.type.some(v => h.toLowerCase().includes(v))
    )
    if (typeHeader) {
      value = String(row[typeHeader] || '').toLowerCase().trim()
    }
  }
  
  // Try to match with keywords
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some(keyword => value.includes(keyword))) {
      return type as TransactionType
    }
  }
  
  // Default fallback
  if (value) {
    if (value.includes('in')) return 'income'
    if (value.includes('ex') || value.includes('out')) return 'expense'
  }
  
  return null
}

/**
 * Extract and normalize amount
 */
function extractAmount(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): number {
  let value = ''
  
  if (mapping.amount !== undefined) {
    value = String(row[headers[mapping.amount]] || '0')
  } else {
    // Try to find amount column
    const amountHeader = headers.find(h => 
      COLUMN_MAPPINGS.amount.some(v => h.toLowerCase().includes(v))
    )
    if (amountHeader) {
      value = String(row[amountHeader] || '0')
    }
  }
  
  // Clean and parse amount
  const cleanValue = value
    .replace(/[₹$,\s]/g, '') // Remove currency symbols and commas
    .replace(/-/g, '') // Remove negative signs
    .trim()
  
  return parseFloat(cleanValue) || 0
}

/**
 * Extract category
 */
function extractCategory(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): string {
  if (mapping.category !== undefined) {
    return String(row[headers[mapping.category]] || '').trim()
  }
  
  const categoryHeader = headers.find(h => 
    COLUMN_MAPPINGS.category.some(v => h.toLowerCase().includes(v))
  )
  
  if (categoryHeader) {
    return String(row[categoryHeader] || '').trim()
  }
  
  return ''
}

/**
 * Extract and normalize date
 */
function extractDate(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): string {
  let value = ''
  
  if (mapping.date !== undefined) {
    value = String(row[headers[mapping.date]] || '')
  } else {
    const dateHeader = headers.find(h => 
      COLUMN_MAPPINGS.date.some(v => h.toLowerCase().includes(v))
    )
    if (dateHeader) {
      value = String(row[dateHeader] || '')
    }
  }
  
  if (!value) return ''
  
  // Try to parse various date formats
  try {
    // Handle Excel serial date
    if (!isNaN(Number(value))) {
      const excelDate = XLSX.SSF.parse_date_code(Number(value))
      return `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
    }
    
    // Handle DD/MM/YYYY or MM/DD/YYYY
    const parts = value.split(/[-/]/)
    if (parts.length === 3) {
      let day, month, year
      
      // Try DD/MM/YYYY
      if (parseInt(parts[0]) <= 31 && parseInt(parts[1]) <= 12) {
        day = parts[0]
        month = parts[1]
        year = parts[2]
      } else if (parseInt(parts[1]) <= 31 && parseInt(parts[0]) <= 12) {
        // Try MM/DD/YYYY
        month = parts[0]
        day = parts[1]
        year = parts[2]
      }
      
      if (day && month && year) {
        // Normalize to YYYY-MM-DD
        const fullYear = year.length === 2 ? `20${year}` : year
        return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    
    // Try ISO format
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }
  } catch (error) {
    console.error('Date parsing error:', error)
  }
  
  return ''
}

/**
 * Extract description
 */
function extractDescription(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): string {
  if (mapping.description !== undefined) {
    return String(row[headers[mapping.description]] || '').trim()
  }
  
  const descHeader = headers.find(h => 
    COLUMN_MAPPINGS.description.some(v => h.toLowerCase().includes(v))
  )
  
  if (descHeader) {
    return String(row[descHeader] || '').trim()
  }
  
  return ''
}

/**
 * Extract payment method
 */
function extractPaymentMethod(
  row: any, 
  headers: string[], 
  mapping: ExcelColumnMapping
): string | null {
  if (mapping.payment_method !== undefined) {
    const value = String(row[headers[mapping.payment_method]] || '').trim()
    return value || null
  }
  
  const pmHeader = headers.find(h => 
    COLUMN_MAPPINGS.payment_method.some(v => h.toLowerCase().includes(v))
  )
  
  if (pmHeader) {
    const value = String(row[pmHeader] || '').trim()
    return value || null
  }
  
  return null
}

/**
 * Validate date format (YYYY-MM-DD)
 */
function isValidDate(dateString: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return false
  }
  
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Export to Excel (for download feature)
 */
export function exportToExcel(
  data: FinanceTransaction[], 
  filename: string = 'transactions.xlsx'
): void {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')
  XLSX.writeFile(workbook, filename)
}
