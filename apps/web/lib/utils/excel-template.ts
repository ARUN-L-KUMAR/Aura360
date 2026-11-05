import * as XLSX from 'xlsx'

/**
 * Generate and download a sample Excel template for finance transactions
 */
export function generateSampleTemplate() {
  const sampleData = [
    {
      'Type': 'expense',
      'Amount': 500,
      'Category': 'food',
      'Date': '2024-01-15',
      'Description': 'Lunch at restaurant'
    },
    {
      'Type': 'income',
      'Amount': 10000,
      'Category': 'salary',
      'Date': '2024-01-01',
      'Description': 'Monthly salary'
    },
    {
      'Type': 'expense',
      'Amount': 1200,
      'Category': 'rent',
      'Date': '2024-01-05',
      'Description': 'Monthly rent payment'
    },
    {
      'Type': 'expense',
      'Amount': 350,
      'Category': 'transport',
      'Date': '2024-01-10',
      'Description': 'Bus tickets and petrol'
    },
    {
      'Type': 'investment',
      'Amount': 5000,
      'Category': 'investment',
      'Date': '2024-01-20',
      'Description': 'Monthly SIP investment'
    }
  ]

  const worksheet = XLSX.utils.json_to_sheet(sampleData)
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 15 }, // Type
    { wch: 12 }, // Amount
    { wch: 20 }, // Category
    { wch: 15 }, // Date
    { wch: 40 }, // Description
  ]

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')

  // Add a second sheet with instructions
  const instructionsData = [
    { 'Field': 'Type', 'Description': 'Transaction type: expense, income, investment, or transfer', 'Example': 'expense' },
    { 'Field': 'Amount', 'Description': 'Transaction amount (positive number)', 'Example': '500' },
    { 'Field': 'Category', 'Description': 'Category name (food, transport, salary, etc.)', 'Example': 'food' },
    { 'Field': 'Date', 'Description': 'Date in YYYY-MM-DD format', 'Example': '2024-01-15' },
    { 'Field': 'Description', 'Description': 'Brief description of the transaction', 'Example': 'Lunch at restaurant' },
  ]

  const instructionsSheet = XLSX.utils.json_to_sheet(instructionsData)
  instructionsSheet['!cols'] = [
    { wch: 15 },
    { wch: 60 },
    { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions')

  // Download the file
  XLSX.writeFile(workbook, 'sample-finance-template.xlsx')
}

/**
 * Example JSON output format
 */
export const EXAMPLE_JSON_OUTPUT = [
  {
    "type": "expense",
    "amount": 500,
    "category": "food",
    "date": "2024-01-15",
    "description": "Lunch at restaurant",
    "payment_method": null,
    "notes": null
  },
  {
    "type": "income",
    "amount": 10000,
    "category": "salary",
    "date": "2024-01-01",
    "description": "Monthly salary",
    "payment_method": "bank transfer",
    "notes": null
  }
]

/**
 * Supported Excel formats documentation
 */
export const SUPPORTED_FORMATS = {
  fileTypes: [
    '.xlsx (Excel 2007+)',
    '.xls (Excel 97-2003)',
    '.csv (Comma-separated values)'
  ],
  columnNames: {
    type: ['type', 'transaction type', 'category type', 'trans type', 'kind'],
    amount: ['amount', 'value', 'sum', 'total', 'spent', 'expense', 'income', 'debit', 'credit', 'price', 'cost'],
    category: ['category', 'cat', 'group', 'tag', 'label'],
    date: ['date', 'transaction date', 'trans date', 'day', 'timestamp'],
    description: ['description', 'desc', 'details', 'note', 'notes', 'memo']
  },
  dateFormats: [
    'YYYY-MM-DD (recommended)',
    'DD/MM/YYYY',
    'MM/DD/YYYY',
    'Excel date serial number'
  ],
  typeValues: [
    'expense, spent, debit, payment',
    'income, credit, received, earned',
    'investment, invest, stock',
    'transfer, moved'
  ]
}
