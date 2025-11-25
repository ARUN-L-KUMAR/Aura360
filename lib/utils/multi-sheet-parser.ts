import * as XLSX from 'xlsx'

export interface ParsedTransaction {
  type: 'income' | 'expense' | 'investment'
  amount: number
  category: string
  date: string
  description: string
  payment_method: string
  isValid: boolean
  errors: string[]
  originalRow: number
  needs_review: boolean
  raw_amount?: string
  raw_date?: string
}

export interface MultiSheetParseResult {
  transactions: ParsedTransaction[]
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
    needsReviewRows: number
    byType: {
      income: number
      expense: number
      investment: number
    }
  }
  errors: string[]
  availableSheets?: string[]
}

/**
 * Get list of available sheets in Excel file without parsing
 */
export function getExcelSheets(file: File): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false })
        resolve(workbook.SheetNames)
      } catch (error: any) {
        reject(new Error(`Failed to read Excel file: ${error.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Parse multi-sheet Excel file with custom formats for Income, Expense, Invest, Scholarship
 */
export function parseMultiSheetExcel(file: File, selectedSheetNames?: string[]): Promise<MultiSheetParseResult> {
  console.log(`🔍 [PARSER START] File: ${file.name}, Selected sheets:`, selectedSheetNames)
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true })

        const allTransactions: ParsedTransaction[] = []
        const errors: string[] = []

        // Process each sheet (filter by selected sheets if provided)
        const sheetsToProcess = selectedSheetNames && selectedSheetNames.length > 0
          ? workbook.SheetNames.filter(name => selectedSheetNames.includes(name))
          : workbook.SheetNames
        
        console.log(`🔍 [PARSER] Processing ${sheetsToProcess.length} sheets:`, sheetsToProcess)

        sheetsToProcess.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          const sheetNameLower = sheetName.toLowerCase()

          try {
            if (sheetNameLower.includes('income') || sheetNameLower.includes('earning') || sheetNameLower.includes('scholarship')) {
              // Parse Income/Scholarship sheet
              const transactions = parseIncomeSheet(sheet, sheetName)
              allTransactions.push(...transactions)
            } else if (sheetNameLower.includes('expense') || sheetNameLower.includes('spend')) {
              // Parse Expense sheet
              const transactions = parseExpenseSheet(sheet, sheetName)
              allTransactions.push(...transactions)
            } else if (sheetNameLower.includes('invest')) {
              // Parse Investment sheet
              const transactions = parseInvestmentSheet(sheet, sheetName)
              allTransactions.push(...transactions)
            }
          } catch (error: any) {
            errors.push(`Error parsing sheet "${sheetName}": ${error.message}`)
          }
        })

        // Generate summary
        console.log(`🔍 [PARSER] All sheets processed. Total transactions:`, allTransactions.length)
        console.log(`🔍 [PARSER] Breakdown:`, {
          isValid_true: allTransactions.filter(t => t.isValid === true).length,
          needs_review_true: allTransactions.filter(t => t.needs_review === true).length,
          both_false: allTransactions.filter(t => !t.isValid && !t.needs_review).length
        })
        
        // NEW — Treat needs_review rows as financially valid
        const financeRows = allTransactions.filter(
          (t) => t.isValid || t.needs_review
        );
        console.log(`🔍 [PARSER] Finance rows (isValid OR needs_review):`, financeRows.length)

        const summary = {
          totalRows: allTransactions.length,
          validRows: financeRows.length,
          invalidRows: allTransactions.filter(
            (t) => !t.isValid && !t.needs_review
          ).length,
          needsReviewRows: allTransactions.filter((t) => t.needs_review).length,
          byType: {
            income: allTransactions.filter(t => t.type === 'income').length,
            expense: allTransactions.filter(t => t.type === 'expense').length,
            investment: allTransactions.filter(t => t.type === 'investment').length,
          }
        }

        resolve({
          transactions: allTransactions,
          summary,
          errors
        })
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel file: ${error.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Parse Income sheet format:
 * Columns: SERIAL NO | DATE | DESCRIPTION | AMOUNT
 * NEW: Keep ALL rows, mark problematic ones as needs_review
 */
function parseIncomeSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedTransaction[] {
  console.log(`🔍 [PARSER] Starting parseIncomeSheet for: ${sheetName}`)
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
  const transactions: ParsedTransaction[] = []
  
  console.log(`🔍 [PARSER INCOME] Total rows in sheet:`, jsonData.length)
  console.log(`🔍 [PARSER INCOME] First 3 rows:`, jsonData.slice(0, 3))

  // Find header row (look for DATE, DESCRIPTION, AMOUNT)
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i].map(cell => String(cell).toLowerCase())
    if (row.some(cell => cell.includes('date')) && 
        row.some(cell => cell.includes('description')) && 
        row.some(cell => cell.includes('amount'))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.log(`🔍 [PARSER INCOME] ⚠️ No header row found!`)
    return [] // No valid header found
  }
  
  console.log(`🔍 [PARSER INCOME] Header found at row index:`, headerRowIndex)

  const headerRow = jsonData[headerRowIndex].map(cell => String(cell).toLowerCase())
  const dateColIndex = headerRow.findIndex(h => h.includes('date'))
  const descColIndex = headerRow.findIndex(h => h.includes('description'))
  const amountColIndex = headerRow.findIndex(h => h.includes('amount'))
  
  console.log(`🔍 [PARSER INCOME] Column indices:`, { dateColIndex, descColIndex, amountColIndex })

  // Parse data rows (skip header) - KEEP ALL ROWS
  let skippedEmptyRows = 0
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    
    // Skip completely empty rows
    if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
      skippedEmptyRows++
      continue
    }

    const dateValue = row[dateColIndex]
    const description = String(row[descColIndex] || '').trim()
    const amountValue = row[amountColIndex]

    // NEW: Keep row even if amount or description is missing
    const rawAmount = String(amountValue || '')
    const rawDate = String(dateValue || '')
    
    const parsedAmount = parseAmount(amountValue)
    const parsedDate = parseDate(dateValue)
    
    const transaction: ParsedTransaction = {
      type: 'income',
      amount: parsedAmount,
      category: extractCategory(description, 'income'),
      date: parsedDate,
      description: description || '(No description)',
      payment_method: 'bank_transfer',
      isValid: false,
      errors: [],
      originalRow: i + 1,
      needs_review: false,
      raw_amount: rawAmount,
      raw_date: rawDate
    }

    // Validate - but DON'T skip the row
    validateTransactionV2(transaction, amountValue, dateValue, description)
    transactions.push(transaction)
  }

  console.log(`🔍 [PARSER INCOME] Completed:`, {
    sheetName,
    totalRowsInSheet: jsonData.length,
    headerRowIndex,
    skippedEmptyRows,
    totalTransactionsParsed: transactions.length,
    validRows: transactions.filter(t => t.isValid).length,
    needsReviewRows: transactions.filter(t => t.needs_review).length
  })

  return transactions
}

/**
 * Parse Expense sheet format:
 * Columns: SERIAL NO | DATE | SPENDED | AMOUNT
 * NEW: Keep ALL rows, mark problematic ones as needs_review
 */
function parseExpenseSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedTransaction[] {
  console.log(`🔍 [PARSER] Starting parseExpenseSheet for: ${sheetName}`)
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
  const transactions: ParsedTransaction[] = []
  
  console.log(`🔍 [PARSER EXPENSE] Total rows in sheet:`, jsonData.length)
  console.log(`🔍 [PARSER EXPENSE] First 3 rows:`, jsonData.slice(0, 3))

  // Find header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i].map(cell => String(cell).toLowerCase())
    if (row.some(cell => cell.includes('date')) && 
        (row.some(cell => cell.includes('spend')) || row.some(cell => cell.includes('description'))) && 
        row.some(cell => cell.includes('amount'))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    console.log(`🔍 [PARSER EXPENSE] ⚠️ No header row found!`)
    return []
  }
  
  console.log(`🔍 [PARSER EXPENSE] Header found at row index:`, headerRowIndex)

  const headerRow = jsonData[headerRowIndex].map(cell => String(cell).toLowerCase())
  const dateColIndex = headerRow.findIndex(h => h.includes('date'))
  const descColIndex = headerRow.findIndex(h => h.includes('spend') || h.includes('description'))
  const amountColIndex = headerRow.findIndex(h => h.includes('amount'))
  
  console.log(`🔍 [PARSER EXPENSE] Column indices:`, { dateColIndex, descColIndex, amountColIndex })

  // Parse data rows - KEEP ALL ROWS
  let skippedEmptyRows = 0
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    
    if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
      skippedEmptyRows++
      continue
    }

    const dateValue = row[dateColIndex]
    const description = String(row[descColIndex] || '').trim()
    const amountValue = row[amountColIndex]

    // NEW: Keep row even if amount or description is missing
    const rawAmount = String(amountValue || '')
    const rawDate = String(dateValue || '')
    
    const parsedAmount = parseAmount(amountValue)
    const parsedDate = parseDate(dateValue)

    const transaction: ParsedTransaction = {
      type: 'expense',
      amount: parsedAmount,
      category: extractCategory(description, 'expense'),
      date: parsedDate,
      description: description || '(No description)',
      payment_method: 'upi',
      isValid: false,
      errors: [],
      originalRow: i + 1,
      needs_review: false,
      raw_amount: rawAmount,
      raw_date: rawDate
    }

    validateTransactionV2(transaction, amountValue, dateValue, description)
    transactions.push(transaction)
  }

  console.log(`🔍 [PARSER EXPENSE] Completed:`, {
    sheetName,
    totalRowsInSheet: jsonData.length,
    headerRowIndex,
    skippedEmptyRows,
    totalTransactionsParsed: transactions.length,
    validRows: transactions.filter(t => t.isValid).length,
    needsReviewRows: transactions.filter(t => t.needs_review).length
  })

  return transactions
}

/**
 * Parse Investment sheet format:
 * Columns: SERIAL NO | DATE | DESCRIPTION | Unnamed | SIP (Amount)
 * NEW: Keep ALL rows, mark problematic ones as needs_review
 */
function parseInvestmentSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedTransaction[] {
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]
  const transactions: ParsedTransaction[] = []

  // Find header row
  let headerRowIndex = -1
  for (let i = 0; i < Math.min(5, jsonData.length); i++) {
    const row = jsonData[i].map(cell => String(cell).toLowerCase())
    if (row.some(cell => cell.includes('date')) && 
        row.some(cell => cell.includes('description')) && 
        (row.some(cell => cell.includes('sip')) || row.some(cell => cell.includes('amount')))) {
      headerRowIndex = i
      break
    }
  }

  if (headerRowIndex === -1) {
    return []
  }

  const headerRow = jsonData[headerRowIndex].map(cell => String(cell).toLowerCase())
  const dateColIndex = headerRow.findIndex(h => h.includes('date'))
  const descColIndex = headerRow.findIndex(h => h.includes('description'))
  // SIP amount is usually the last column or labeled "SIP" or "Amount"
  const amountColIndex = headerRow.findIndex(h => h.includes('sip') || h.includes('amount'))

  // Parse data rows - KEEP ALL ROWS
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    
    if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
      continue
    }

    const dateValue = row[dateColIndex]
    const description = String(row[descColIndex] || '').trim()
    const amountValue = row[amountColIndex] || row[row.length - 1] // Try last column if not found

    // NEW: Keep row even if amount or description is missing
    const rawAmount = String(amountValue || '')
    const rawDate = String(dateValue || '')
    
    const parsedAmount = parseAmount(amountValue)
    const parsedDate = parseDate(dateValue)

    const transaction: ParsedTransaction = {
      type: 'investment',
      amount: parsedAmount,
      category: extractCategory(description, 'investment'),
      date: parsedDate,
      description: description || '(No description)',
      payment_method: 'bank_transfer',
      isValid: false,
      errors: [],
      originalRow: i + 1,
      needs_review: false,
      raw_amount: rawAmount,
      raw_date: rawDate
    }

    validateTransactionV2(transaction, amountValue, dateValue, description)
    transactions.push(transaction)
  }

  return transactions
}

/**
 * Parse amount from various formats
 * NEW: Always return a number, 0 if invalid
 */
function parseAmount(value: any): number {
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }

  // Convert to string and clean
  const cleaned = String(value)
    .replace(/[₹$,\s]/g, '') // Remove currency symbols and commas
    .replace(/—/g, '')       // Remove em-dash
    .replace(/-/g, '')       // Remove dash
    .trim()

  if (!cleaned || cleaned === '' || cleaned.toLowerCase() === 'nan') {
    return 0
  }

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Parse date from various formats
 */
function parseDate(value: any): string {
  if (!value || value === '—' || value === '-') {
    return ''
  }

  // If already a Date object
  if (value instanceof Date) {
    return formatDateToISO(value)
  }

  // If Excel serial number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
  }

  // If string date
  const dateStr = String(value).trim()

  // Try DD/MM/YYYY format (your format)
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try YYYY-MM-DD
  const yyyymmddMatch = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/)
  if (yyyymmddMatch) {
    const [, year, month, day] = yyyymmddMatch
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // Try parsing as JS Date
  const parsed = new Date(dateStr)
  if (!isNaN(parsed.getTime())) {
    return formatDateToISO(parsed)
  }

  return ''
}

function formatDateToISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Extract category from description
 */
function extractCategory(description: string, type: string): string {
  const descLower = description.toLowerCase()

  if (type === 'income') {
    if (descLower.includes('salary') || descLower.includes('pay')) return 'Salary'
    if (descLower.includes('appa') || descLower.includes('amma') || descLower.includes('parent')) return 'Family Support'
    if (descLower.includes('scholarship')) return 'Scholarship'
    if (descLower.includes('balance') || descLower.includes('hand')) return 'Initial Balance'
    return 'Other Income'
  }

  if (type === 'expense') {
    if (descLower.includes('bus') || descLower.includes('transport')) return 'Transport'
    if (descLower.includes('food') || descLower.includes('lunch') || descLower.includes('dinner')) return 'Food'
    if (descLower.includes('room') || descLower.includes('rent')) return 'Rent'
    if (descLower.includes('college') || descLower.includes('clg') || descLower.includes('class')) return 'Education'
    if (descLower.includes('book')) return 'Books'
    if (descLower.includes('recharge') || descLower.includes('mobile')) return 'Mobile'
    return 'Other Expense'
  }

  if (type === 'investment') {
    if (descLower.includes('sip')) return 'SIP'
    if (descLower.includes('mutual')) return 'Mutual Funds'
    if (descLower.includes('stock')) return 'Stocks'
    return 'Investment'
  }

  return 'Other'
}

/**
 * NEW Validation function - marks rows as needs_review instead of invalid
 */
function validateTransactionV2(transaction: ParsedTransaction, rawAmount: any, rawDate: any, rawDescription: string): void {
  const errors: string[] = []
  let needsReview = false

  // Check amount
  const amountStr = String(rawAmount || '').trim()
  if (!amountStr || amountStr === '—' || amountStr === '-' || amountStr === '' || 
      amountStr.toLowerCase() === 'nan' || transaction.amount === 0) {
    errors.push('Amount is missing or invalid (set to ₹0)')
    needsReview = true
  }

  // Check date
  const dateStr = String(rawDate || '').trim()
  if (!dateStr || dateStr === '—' || dateStr === '-' || dateStr === '' || !transaction.date) {
    errors.push('Date is missing or invalid')
    needsReview = true
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(transaction.date)) {
      errors.push('Invalid date format')
      needsReview = true
    }
  }

  // Check description
  if (!rawDescription || rawDescription.trim() === '') {
    errors.push('Description is missing')
    needsReview = true
  }

  // Check if this is a footer/total row
  const descLower = transaction.description.toLowerCase()
  if (descLower.includes('total') || descLower.includes('sum') || descLower.includes('grand')) {
    errors.push('Appears to be a summary/total row')
    needsReview = true
  }

  transaction.errors = errors
  transaction.needs_review = needsReview
  transaction.isValid = !needsReview // Only valid if no review needed
}

/**
 * OLD Validation function (kept for reference, not used)
 */
function validateTransaction(transaction: ParsedTransaction): void {
  const errors: string[] = []

  if (!transaction.amount || transaction.amount <= 0) {
    errors.push('Amount must be greater than 0')
  }

  if (!transaction.date) {
    errors.push('Date is required')
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(transaction.date)) {
      errors.push('Invalid date format')
    }
  }

  if (!transaction.category) {
    errors.push('Category is required')
  }

  transaction.errors = errors
  transaction.isValid = errors.length === 0
}
