'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  TrendingUp,
  TrendingDown,
  PiggyBank
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { parseExcelFile } from '@/lib/utils/excel-parser'
import type { ParsedExcelRow } from '@/lib/types/finance'
import { useToast } from '@/hooks/use-toast'
import { DownloadSampleButton } from './download-sample-button'

interface ExcelUploadDialogProps {
  onImportComplete?: () => void
}

export function ExcelUploadDialog({ onImportComplete }: ExcelUploadDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedExcelRow[]>([])
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, succeeded: 0, failed: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ]
    
    if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(xlsx?|csv)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please upload a valid Excel file (.xlsx, .xls, or .csv)",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
    setUploading(true)
    setError(null)

    try {
      const data = await parseExcelFile(selectedFile)
      setParsedData(data)
      
      if (data.length === 0) {
        setError('No data found in the Excel file')
        toast({
          title: "No Data Found",
          description: "The Excel file doesn't contain valid transaction data",
          variant: "destructive",
        })
      } else {
        const validCount = data.filter(row => row.isValid).length
        toast({
          title: "File Parsed Successfully",
          description: `Found ${validCount} valid transactions from ${data.length} rows`,
        })
      }
    } catch (err: any) {
      console.error('Parse error:', err)
      setError(err.message || 'Failed to parse Excel file')
      toast({
        title: "Parse Error",
        description: err.message || "Failed to parse Excel file",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleImport = async () => {
    const validTransactions = parsedData.filter(row => row.isValid)
    
    if (validTransactions.length === 0) {
      toast({
        title: "No Valid Data",
        description: "Please fix validation errors before importing",
        variant: "destructive",
      })
      return
    }

    setImporting(true)
    setError(null)
    setImportProgress({ current: 0, total: validTransactions.length, succeeded: 0, failed: 0 })

    // Show initial toast
    toast({
      title: "Importing Transactions",
      description: `Processing ${validTransactions.length} transactions...`,
    })

    try {
      // Import all valid transactions
      const newTransactions = validTransactions

      // Import transactions using API with progress tracking
      const total = newTransactions.length
      let completed = 0
      let succeeded = 0
      let failed = 0

      const promises = newTransactions.map(async (t, index) => {
        try {
          const response = await fetch("/api/finance/transactions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: t.type,
              amount: t.amount,
              category: t.category,
              date: t.date,
              description: t.description || null,
              paymentMethod: "upi",
            }),
          })

          const result = await response.json()
          completed++
          
          if (response.ok) {
            succeeded++
          } else {
            failed++
          }

          // Update progress state
          setImportProgress({ current: completed, total, succeeded, failed })

          // Show progress every 10 transactions or at the end
          if (completed % 10 === 0 || completed === total) {
            toast({
              title: "Import Progress",
              description: `${completed}/${total} transactions processed (${succeeded} success, ${failed} failed)`,
            })
          }

          return { success: response.ok, data: result }
        } catch (error) {
          completed++
          failed++
          return { success: false, error }
        }
      })

      await Promise.all(promises)

      if (succeeded > 0) {
        toast({
          title: "Import Complete! ✅",
          description: `Successfully imported ${succeeded} of ${total} transactions${failed > 0 ? `. ${failed} failed.` : ''}`,
        })

        setOpen(false)
        setParsedData([])
        setFile(null)
        window.location.reload()
      } else {
        throw new Error('All transactions failed to import')
      }
    } catch (err: any) {
      console.error('Import error:', err)
      setError(err.message)
      toast({
        title: "Import Failed",
        description: err.message || "Failed to import transactions",
        variant: "destructive",
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReset = () => {
    setParsedData([])
    setFile(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validCount = parsedData.filter(row => row.isValid).length
  const invalidCount = parsedData.length - validCount

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "income":
        return <TrendingUp className="h-3 w-3" />
      case "expense":
        return <TrendingDown className="h-3 w-3" />
      case "investment":
        return <PiggyBank className="h-3 w-3" />
      default:
        return null
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "income":
        return "bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200"
      case "expense":
        return "bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200"
      case "investment":
        return "bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-200"
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" />
          Upload Excel Sheet
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Transactions from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx, .xls, or .csv) with your transaction data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Section */}
          {!file && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                />
                <label 
                  htmlFor="excel-upload"
                  className="cursor-pointer flex flex-col items-center gap-4"
                >
                  <div className="p-4 bg-primary/10 rounded-full">
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    ) : (
                      <Upload className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-lg font-medium">
                      {uploading ? 'Parsing Excel file...' : 'Click to upload Excel file'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports .xlsx, .xls, and .csv files
                    </p>
                  </div>
                </label>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-medium mb-2">Expected Format</h3>
                <div className="text-sm space-y-2 text-muted-foreground">
                  <p><strong>Single Sheet Format:</strong> Type | Amount | Category | Date | Description</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-xs"><strong>Type Column (Required):</strong> Must be "income", "expense", or "investment"</p>
                    <p className="text-xs"><strong>Amount Column (Required):</strong> Numeric values (currency symbols will be removed)</p>
                    <p className="text-xs"><strong>Category Column (Required):</strong> Text values (e.g., Food, Salary, Transport)</p>
                    <p className="text-xs"><strong>Date Column (Required):</strong> DD/MM/YYYY or YYYY-MM-DD format</p>
                    <p className="text-xs"><strong>Description Column (Optional):</strong> Text description of the transaction</p>
                  </div>
                  <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded">
                    <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                      ⚠️ Important: Each row must specify its Type (income/expense/investment) in a dedicated Type column
                    </p>
                  </div>
                  <p className="mt-3 text-xs">Column names are auto-detected. Various column name formats are supported (e.g., "spent" for expense, "credit" for income).</p>
                </div>
              </div>

              <div className="flex justify-center">
                <DownloadSampleButton />
              </div>
            </div>
          )}

          {/* File Info */}
          {file && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Change File
                </Button>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {parsedData.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Total Rows</span>
                </div>
                <p className="text-2xl font-bold">{parsedData.length}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Valid</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{validCount}</p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">Invalid</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{invalidCount}</p>
              </div>
            </div>
          )}

          {/* Invalid Rows Section */}
          {invalidCount > 0 && (
            <div className="border border-red-300 dark:border-red-800 rounded-lg overflow-hidden">
              <div className="bg-red-100 dark:bg-red-950/30 px-4 py-3 border-b border-red-300 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-900 dark:text-red-100">
                    Invalid Rows ({invalidCount})
                  </h3>
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  These rows have validation errors and will not be imported
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData
                      .filter(row => !row.isValid)
                      .map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 bg-red-50/50 dark:bg-red-950/10">
                          <td className="px-4 py-2 font-mono text-xs">{row.rowIndex}</td>
                          <td className="px-4 py-2 capitalize">{row.type}</td>
                          <td className="px-4 py-2">
                            {row.amount > 0 ? `₹${row.amount.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2">{row.category || '—'}</td>
                          <td className="px-4 py-2">{row.date || '—'}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.validationErrors.map((error, errorIdx) => (
                                <span
                                  key={errorIdx}
                                  className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-2 py-1 rounded"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  {error}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valid Rows Preview */}
          {validCount > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2">
                <h3 className="font-medium">Valid Rows Preview (First 5)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Category</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData
                      .filter(row => row.isValid)
                      .slice(0, 5)
                      .map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.rowIndex}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${getTypeColor(row.type)}`}>
                              {getTypeIcon(row.type)}
                              {row.type}
                            </span>
                          </td>
                          <td className="px-4 py-2 font-medium">₹{row.amount.toFixed(2)}</td>
                          <td className="px-4 py-2">{row.category}</td>
                          <td className="px-4 py-2">{row.date}</td>
                          <td className="px-4 py-2 truncate max-w-xs">{row.description}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              {/* Import Progress Bar */}
              {importing && importProgress.total > 0 && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Import Progress</span>
                    <span className="text-muted-foreground">
                      {importProgress.current} / {importProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {importProgress.succeeded} succeeded
                    </span>
                    {importProgress.failed > 0 && (
                      <span className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        {importProgress.failed} failed
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={importing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className="gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing... {importProgress.current}/{importProgress.total}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Import {validCount} Transaction{validCount !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
