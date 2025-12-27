"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Checkbox } from "@/components/ui/checkbox"
import { parseMultiSheetExcel, getExcelSheets, type ParsedTransaction } from "@/lib/utils/multi-sheet-parser"

export function MultiSheetUploadDialog() {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedTransaction[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [availableSheets, setAvailableSheets] = useState<string[]>([])
  const [selectedSheets, setSelectedSheets] = useState<Set<string>>(new Set())
  const [importedFiles, setImportedFiles] = useState<Set<string>>(new Set())
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, succeeded: 0, failed: 0 })

  // Recalculate summary whenever parsedData changes
  useEffect(() => {
    if (parsedData.length > 0) {
      const validTransactions = parsedData.filter(t => t.isValid || t.needs_review)
      
      const income = validTransactions
        .filter(t => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0)
      
      const expenses = validTransactions
        .filter(t => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)
      
      const savings = income - expenses
      
      const expenseCount = validTransactions.filter(t => t.type === "expense").length
      const incomeCount = validTransactions.filter(t => t.type === "income").length
      const investmentCount = validTransactions.filter(t => t.type === "investment").length
      const needsReviewCount = parsedData.filter(t => t.needs_review).length
      
      const newSummary = {
        totalRows: parsedData.length,
        validRows: validTransactions.length,
        invalidRows: parsedData.length - validTransactions.length,
        needsReviewRows: needsReviewCount,
        totalExpense: expenses,
        totalIncome: income,
        savings,
        expenseCount,
        incomeCount,
        byType: {
          income: incomeCount,
          expense: expenseCount,
          investment: investmentCount,
        }
      }
      
      // Only update if values actually changed
      setSummary((prev: any) => {
        if (prev && 
            prev.totalRows === newSummary.totalRows &&
            prev.expenseCount === newSummary.expenseCount &&
            prev.incomeCount === newSummary.incomeCount) {
          return prev // No change, skip update
        }
        
        console.log('🔄 [useEffect] Recalculated summary:', newSummary)
        return newSummary
      })
    } else {
      setSummary(null)
    }
  }, [parsedData])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check if file was already imported
    if (importedFiles.has(selectedFile.name)) {
      toast({
        title: "File Already Imported",
        description: `${selectedFile.name} was already processed. Reset to upload again.`,
        variant: "destructive",
      })
      return
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ]

    if (!validTypes.includes(selectedFile.type) && 
        !selectedFile.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast({
        title: "Invalid File",
        description: "Please upload an Excel file (.xlsx, .xls) or CSV",
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)
    setIsUploading(true)
    setErrors([])
    // Don't clear parsedData - we want to append to it
    setSummary(null)

    try {
      // First, get available sheets
      const sheets = await getExcelSheets(selectedFile)
      setAvailableSheets(sheets)
      
      // Auto-select all sheets by default
      setSelectedSheets(new Set(sheets))

      toast({
        title: "File Loaded",
        description: `Found ${sheets.length} sheet(s). Select which sheets to import.`,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to read Excel file",
        variant: "destructive",
      })
      setErrors([error.message])
    } finally {
      setIsUploading(false)
    }
  }

  const handleParseSelectedSheets = async () => {
    if (!file || selectedSheets.size === 0) {
      toast({
        title: "No Sheets Selected",
        description: "Please select at least one sheet to import",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setErrors([])

    try {
      // 🔍 DEBUG: Capture state BEFORE appending
      const previousData = [...parsedData]
      const previousExpenseCount = previousData.filter(t => t.type === 'expense').length
      const previousExpenseTotal = previousData.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      
      console.log('🔍 DEBUG - BEFORE APPEND:', {
        previousTotalRows: previousData.length,
        previousExpenseCount,
        previousExpenseTotal: `₹${previousExpenseTotal.toFixed(2)}`,
        file: file.name
      })

      const result = await parseMultiSheetExcel(file, Array.from(selectedSheets))
      
      console.log('🔍 [DIALOG] Parser returned:', {
        transactionsCount: result.transactions.length,
        summary: result.summary
      })
      
      // Sample first 3 transactions
      console.log('🔍 [DIALOG] First 3 parsed transactions:', result.transactions.slice(0, 3).map(t => ({
        originalRow: t.originalRow,
        type: t.type,
        isValid: t.isValid,
        needs_review: t.needs_review,
        amount: t.amount,
        description: t.description
      })))
      
      // APPEND new transactions instead of overwriting
      setParsedData(prev => {
        const newData = [...prev, ...result.transactions]
        console.log('🔍 [DIALOG] setParsedData - Appending:', {
          previousCount: prev.length,
          addingCount: result.transactions.length,
          newTotalCount: newData.length,
          previousExpenseCount: prev.filter(t => t.type === 'expense').length,
          addingExpenseCount: result.transactions.filter(t => t.type === 'expense').length,
          newExpenseCount: newData.filter(t => t.type === 'expense').length
        })
        return newData
      })
      
      // Mark file as imported
      if (file) {
        setImportedFiles(prev => new Set([...prev, file.name]))
      }
      
      // 🔍 DEBUG: Check what happened AFTER appending (manually calculate expected state)
      const afterExpenseCount = [...parsedData, ...result.transactions].filter(t => t.type === 'expense').length
      const afterExpenseTotal = [...parsedData, ...result.transactions].filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      
      console.log('🔍 DEBUG - AFTER APPEND:', {
        afterTotalRows: parsedData.length + result.transactions.length,
        afterExpenseCount,
        afterExpenseTotal: `₹${afterExpenseTotal.toFixed(2)}`,
        newRowsAdded: result.transactions.length
      })
      
      // 🔍 DEBUG: Detect lost rows
      if (previousData.length > 0 && afterExpenseCount < previousExpenseCount) {
        const lostCount = previousExpenseCount - afterExpenseCount
        const lostAmount = previousExpenseTotal - afterExpenseTotal
        
        console.error('🚨 ROWS LOST DETECTED!')
        console.error('Lost Rows:', lostCount)
        console.error('Lost Amount:', `₹${lostAmount.toFixed(2)}`)
        
        // Create signature map of what we have now
        const allTransactions = [...parsedData, ...result.transactions]
        const afterSignatures = new Set(
          allTransactions
            .filter(t => t.type === 'expense')
            .map(t => `${t.originalRow}-${t.type}-${t.raw_amount}-${t.raw_date}-${t.description.toLowerCase().trim()}`)
        )
        
        // Find what's missing
        const lostRows = previousData
          .filter(t => t.type === 'expense')
          .filter(t => {
            const signature = `${t.originalRow}-${t.type}-${t.raw_amount}-${t.raw_date}-${t.description.toLowerCase().trim()}`
            return !afterSignatures.has(signature)
          })
        
        console.table(lostRows.map(row => ({
          originalRow: row.originalRow,
          date: row.date || '(empty)',
          description: row.description,
          raw_amount: row.raw_amount || '(empty)',
          amount: row.amount,
          errors: row.errors.join('; ')
        })))
        
        // Show alert to user
        toast({
          title: "⚠️ DATA LOSS DETECTED",
          description: `${lostCount} Expense rows disappeared! Check console for details.`,
          variant: "destructive",
          duration: 10000,
        })
      }
      
      setErrors(result.errors)

      if (result.transactions.length === 0) {
        toast({
          title: "No Data Found",
          description: "The selected sheets don't contain valid transaction data",
          variant: "destructive",
        })
      } else {
        // useEffect will recalculate summary - just show toast with new additions
        toast({
          title: "File Parsed Successfully",
          description: `Added ${result.transactions.length} rows. Total will be ${parsedData.length + result.transactions.length} rows.`,
        })
        
        // Clear file and sheet selection to allow uploading another file
        setFile(null)
        setAvailableSheets([])
        setSelectedSheets(new Set())
      }
    } catch (error: any) {
      toast({
        title: "Parse Error",
        description: error.message || "Failed to parse Excel file",
        variant: "destructive",
      })
      setErrors([error.message])
    } finally {
      setIsUploading(false)
    }
  }

  const toggleSheetSelection = (sheetName: string) => {
    setSelectedSheets((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(sheetName)) {
        newSet.delete(sheetName)
      } else {
        newSet.add(sheetName)
      }
      return newSet
    })
  }

  const getSheetType = (sheetName: string) => {
    const nameLower = sheetName.toLowerCase()
    if (nameLower.includes('income') || nameLower.includes('earning') || nameLower.includes('scholarship')) {
      return 'income'
    } else if (nameLower.includes('expense') || nameLower.includes('spend')) {
      return 'expense'
    } else if (nameLower.includes('invest')) {
      return 'investment'
    }
    return 'unknown'
  }

  const getSheetIcon = (type: string) => {
    switch (type) {
      case 'income':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'expense':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'investment':
        return <PiggyBank className="h-4 w-4 text-purple-600" />
      default:
        return <FileSpreadsheet className="h-4 w-4 text-gray-600" />
    }
  }

  const handleEditTransaction = (index: number, field: keyof ParsedTransaction, value: any) => {
    setParsedData((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      
      // Re-validate if critical fields are edited
      if (field === 'amount' || field === 'date' || field === 'description') {
        const t = updated[index]
        const errors: string[] = []
        let needsReview = false
        
        if (!t.amount || t.amount === 0) {
          errors.push('Amount is missing or invalid (set to ₹0)')
          needsReview = true
        }
        
        if (!t.date) {
          errors.push('Date is missing or invalid')
          needsReview = true
        }
        
        if (!t.description || t.description === '(No description)') {
          errors.push('Description is missing')
          needsReview = true
        }
        
        updated[index].errors = errors
        updated[index].needs_review = needsReview
        updated[index].isValid = !needsReview
      }
      
      return updated
    })
  }

  const handleDeleteTransaction = (index: number) => {
    setParsedData((prev) => prev.filter((_, i) => i !== index))
  }

  const handleImport = async () => {
    console.log('🔍 [IMPORT] Starting import. Current parsedData:', {
      totalRows: parsedData.length,
      byType: {
        income: parsedData.filter(t => t.type === 'income').length,
        expense: parsedData.filter(t => t.type === 'expense').length,
        investment: parsedData.filter(t => t.type === 'investment').length
      },
      byValidity: {
        isValid: parsedData.filter(t => t.isValid).length,
        needs_review: parsedData.filter(t => t.needs_review).length,
        invalid: parsedData.filter(t => !t.isValid && !t.needs_review).length
      }
    })
    
    // NEW: Allow importing all transactions (including needs_review ones)
    // Users can choose to import with warnings
    const transactionsToImport = parsedData.filter(t => t.isValid || t.needs_review)
    const needsReviewCount = transactionsToImport.filter(t => t.needs_review).length
    
    console.log('🔍 [IMPORT] Filtered transactionsToImport:', {
      count: transactionsToImport.length,
      needsReviewCount,
      formula: 'filter(t => t.isValid || t.needs_review)'
    })

    if (transactionsToImport.length === 0) {
      toast({
        title: "No Data to Import",
        description: "All rows have been removed or are invalid",
        variant: "destructive",
      })
      return
    }

    // Warn if importing needs_review rows
    if (needsReviewCount > 0) {
      if (!confirm(`${needsReviewCount} rows need review (missing/invalid data). Import anyway?`)) {
        return
      }
    }

    setIsImporting(true)
    setImportProgress({ current: 0, total: transactionsToImport.length, succeeded: 0, failed: 0 })

    try {
      const batchSize = 100 // Process 100 at a time for visible progress
      let succeeded = 0
      let failed = 0

      for (let i = 0; i < transactionsToImport.length; i += batchSize) {
        const batch = transactionsToImport.slice(i, i + batchSize)
        const newTransactions = batch.map(t => ({
          type: t.type,
          amount: t.amount || 0,
          category: t.category || "Uncategorized",
          date: t.date || new Date().toISOString().split('T')[0],
          description: t.description || "No description",
          paymentMethod: t.payment_method || "other",
        }))

        try {
          // Import batch
          const response = await fetch("/api/finance/transactions/bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              transactions: newTransactions,
            }),
          })

          const result = await response.json()

          if (response.ok && result.data) {
            succeeded += result.data.succeeded
            failed += result.data.failed
          } else {
            failed += batch.length
          }
        } catch (error) {
          failed += batch.length
        }

        // Update progress after each batch
        setImportProgress({
          current: i + batch.length,
          total: transactionsToImport.length,
          succeeded,
          failed,
        })

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Show final result
      if (failed > 0) {
        toast({
          title: "Import Completed with Errors",
          description: `${succeeded} succeeded, ${failed} failed`,
          variant: "destructive",
        })
        // Wait a moment to show error status
        await new Promise(resolve => setTimeout(resolve, 1500))
      } else {
        // Success popup - show for 3 seconds
        toast({
          title: "✅ Import Successful!",
          description: `Successfully imported all ${succeeded} transactions. Refreshing page...`,
          duration: 3000, // 3 seconds
        })
        // Wait 3 seconds to show success status
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
      
      handleReset()
      setIsOpen(false)
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "❌ Import Failed",
        description: error.message || "Failed to import transactions",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setParsedData([])
    setSummary(null)
    setErrors([])
    setAvailableSheets([])
    setSelectedSheets(new Set())
    setImportedFiles(new Set())
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Upload Excel Sheet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl">Upload Excel File</DialogTitle>
          <DialogDescription className="text-sm">
            Upload your Excel file with Income, Expense, Investment, and Scholarship sheets
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats - Show at top if data exists */}
          {summary && parsedData.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">Total Rows</span>
                </div>
                <p className="text-2xl font-bold">{summary.totalRows}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Valid</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{summary.validRows}</p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-muted-foreground">Needs Review</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{summary.needsReviewRows}</p>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-muted-foreground">Invalid</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{summary.invalidRows}</p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Upload className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">Ready</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{summary.validRows + summary.needsReviewRows}</p>
              </div>
            </div>
          )}

          {/* File Upload */}
          {!file && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                {parsedData.length > 0 ? 'Upload another Excel file to add more transactions' : 'Select your Excel file with multiple sheets'}
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="multi-sheet-upload"
              />
              <label htmlFor="multi-sheet-upload">
                <Button variant="outline" className="cursor-pointer" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
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
                      {importedFiles.size > 0 && (
                        <span className="ml-2 text-xs">• {importedFiles.size} file(s) imported</span>
                      )}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  Reset All
                </Button>
              </div>
            </div>
          )}

          {/* Imported Files List */}
          {importedFiles.size > 0 && !file && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-100">Previously Imported Files ({importedFiles.size}):</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-green-800 dark:text-green-200">
                    {Array.from(importedFiles).map((fileName) => (
                      <li key={fileName}>{fileName}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                    Upload another file to add more transactions, or click "Reset All" to start over.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sheet Selection */}
          {availableSheets.length > 0 && file && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Select Sheets to Import</h3>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSheets(new Set(availableSheets))}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedSheets(new Set())}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {availableSheets.map((sheetName) => {
                  const type = getSheetType(sheetName)
                  return (
                    <div
                      key={sheetName}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Checkbox
                        id={`sheet-${sheetName}`}
                        checked={selectedSheets.has(sheetName)}
                        onCheckedChange={() => toggleSheetSelection(sheetName)}
                      />
                      <label
                        htmlFor={`sheet-${sheetName}`}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        {getSheetIcon(type)}
                        <span className="font-medium">{sheetName}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({type === 'unknown' ? 'not recognized' : type})
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>
              <Button
                onClick={handleParseSelectedSheets}
                disabled={selectedSheets.size === 0 || isUploading}
                className="w-full mt-4"
              >
                {isUploading ? "Parsing..." : `Parse ${selectedSheets.size} Selected Sheet(s)`}
              </Button>
            </div>
          )}

          {/* By Type Breakdown */}
          {summary && parsedData.length > 0 && summary.byType && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-3">Transactions by Type</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span>Income</span>
                  </div>
                  <span className="font-medium">{summary.byType.income}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span>Expense</span>
                  </div>
                  <span className="font-medium">{summary.byType.expense}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank className="h-4 w-4 text-purple-600" />
                    <span>Investment</span>
                  </div>
                  <span className="font-medium">{summary.byType.investment}</span>
                </div>
              </div>
            </div>
          )}

          {/* Needs Review Section with Inline Editing */}
          {summary && summary.needsReviewRows > 0 && (
            <div className="border border-yellow-300 dark:border-yellow-800 rounded-lg overflow-hidden">
              <div className="bg-yellow-100 dark:bg-yellow-950/30 px-4 py-3 border-b border-yellow-300 dark:border-yellow-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <h3 className="font-medium text-yellow-900 dark:text-yellow-100">
                    Needs Review ({summary.needsReviewRows})
                  </h3>
                </div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  These rows have missing or invalid data. Edit them below or import with warnings.
                </p>
              </div>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Issues</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData
                      .map((row, idx) => ({ row, idx }))
                      .filter(({ row }) => row.needs_review)
                      .map(({ row, idx }) => (
                        <tr key={idx} className="border-b last:border-0 bg-yellow-50/50 dark:bg-yellow-950/10">
                          <td className="px-4 py-2 font-mono text-xs">{row.originalRow}</td>
                          <td className="px-4 py-2 capitalize">{row.type}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => handleEditTransaction(idx, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded text-sm"
                              placeholder="0"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="date"
                              value={row.date}
                              onChange={(e) => handleEditTransaction(idx, 'date', e.target.value)}
                              className="w-32 px-2 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => handleEditTransaction(idx, 'description', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="Description"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.errors.map((error, errorIdx) => (
                                <span
                                  key={errorIdx}
                                  className="inline-flex items-center gap-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  {error}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTransaction(idx)}
                              className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Invalid Rows Section */}
          {summary && summary.invalidRows > 0 && (
            <div className="border border-red-300 dark:border-red-800 rounded-lg overflow-hidden">
              <div className="bg-red-100 dark:bg-red-950/30 px-4 py-3 border-b border-red-300 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h3 className="font-medium text-red-900 dark:text-red-100">
                    Invalid Rows ({summary.invalidRows})
                  </h3>
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                  These rows have critical errors and will not be imported
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">Row</th>
                      <th className="px-4 py-2 text-left">Type</th>
                      <th className="px-4 py-2 text-left">Amount</th>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-left">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData
                      .filter(row => !row.isValid && !row.needs_review)
                      .map((row, idx) => (
                        <tr key={idx} className="border-b last:border-0 bg-red-50/50 dark:bg-red-950/10">
                          <td className="px-4 py-2 font-mono text-xs">{row.originalRow}</td>
                          <td className="px-4 py-2 capitalize">{row.type}</td>
                          <td className="px-4 py-2">
                            {row.amount > 0 ? `₹${row.amount.toFixed(2)}` : '—'}
                          </td>
                          <td className="px-4 py-2">{row.date || '—'}</td>
                          <td className="px-4 py-2 truncate max-w-[200px]">
                            {row.description || '—'}
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {row.errors.map((error, errorIdx) => (
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

          {/* Sample Data Preview */}
          {parsedData.length > 0 && summary && summary.validRows > 0 && (
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
                          <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{row.originalRow}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
                              row.type === 'income' 
                                ? 'bg-green-100 dark:bg-green-950/20 text-green-800 dark:text-green-200'
                                : row.type === 'expense'
                                ? 'bg-red-100 dark:bg-red-950/20 text-red-800 dark:text-red-200'
                                : 'bg-purple-100 dark:bg-purple-950/20 text-purple-800 dark:text-purple-200'
                            }`}>
                              {row.type === 'income' && <TrendingUp className="h-3 w-3" />}
                              {row.type === 'expense' && <TrendingDown className="h-3 w-3" />}
                              {row.type === 'investment' && <PiggyBank className="h-3 w-3" />}
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

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">Parsing Errors:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-red-800 dark:text-red-200">
                    {errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Format Help */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium mb-2">Expected Format & New Policy</h3>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p><strong>Income Sheet:</strong> SERIAL NO | DATE | DESCRIPTION | AMOUNT</p>
              <p><strong>Expense Sheet:</strong> SERIAL NO | DATE | SPENDED | AMOUNT</p>
              <p><strong>Investment Sheet:</strong> SERIAL NO | DATE | DESCRIPTION | SIP (Amount)</p>
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">✅ NEW: All rows are kept!</p>
                <p className="text-xs mt-1">Rows with missing/invalid data are marked as "Needs Review" with amount set to ₹0. You can edit them before importing or import with warnings.</p>
              </div>
            </div>
          </div>

          {/* Import Progress */}
          {isImporting && importProgress.total > 0 && (
            <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Importing Transactions</span>
                <span className="text-muted-foreground">
                  {importProgress.current} / {importProgress.total}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="text-green-600 dark:text-green-400">✓ {importProgress.succeeded} succeeded</span>
                {importProgress.failed > 0 && (
                  <span className="text-destructive">✗ {importProgress.failed} failed</span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {parsedData.length > 0 && (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || (summary?.validRows === 0 && summary?.needsReviewRows === 0)}
                className="gap-2"
              >
                {isImporting ? (
                  <>Importing... {importProgress.current}/{importProgress.total}</>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Import {(summary?.validRows || 0) + (summary?.needsReviewRows || 0)} Transaction(s)
                    {summary?.needsReviewRows > 0 && (
                      <span className="text-xs opacity-75">({summary.needsReviewRows} need review)</span>
                    )}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
