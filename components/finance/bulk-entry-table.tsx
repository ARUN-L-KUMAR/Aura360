"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, Trash2, Plus, Upload, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

// Transaction type matching database schema
type TransactionType = "income" | "expense" | "investment"

interface BulkEntryRow {
  id: string
  type: TransactionType
  amount: string
  category: string
  date: string
  description: string
  isSaved: boolean
  isValid: boolean
  errors: string[]
}

// Common categories for quick selection
const COMMON_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Healthcare",
  "Education",
  "Salary",
  "Freelance",
  "Investment",
  "Savings",
  "Other",
]

export function BulkEntryTable() {
  const { toast } = useToast()
  const [data, setData] = useState<BulkEntryRow[]>([
    createEmptyRow(),
  ])
  const [isSavingAll, setIsSavingAll] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Create a new empty row
  function createEmptyRow(): BulkEntryRow {
    return {
      id: `temp-${Date.now()}-${Math.random()}`,
      type: "expense",
      amount: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      isSaved: false,
      isValid: false,
      errors: [],
    }
  }

  // Validate a single row
  const validateRow = useCallback((row: BulkEntryRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []

    if (!row.type) errors.push("Type is required")
    if (!row.amount || parseFloat(row.amount) <= 0) errors.push("Amount must be greater than 0")
    if (!row.category.trim()) errors.push("Category is required")
    if (!row.date) errors.push("Date is required")

    // Validate date format
    if (row.date && isNaN(new Date(row.date).getTime())) {
      errors.push("Invalid date format")
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }, [])

  // Update a cell value
  const updateCell = useCallback(
    (rowId: string, columnId: keyof BulkEntryRow, value: string) => {
      setData((old) =>
        old.map((row) => {
          if (row.id === rowId) {
            const updated = { ...row, [columnId]: value, isSaved: false }
            const validation = validateRow(updated)
            return {
              ...updated,
              isValid: validation.isValid,
              errors: validation.errors,
            }
          }
          return row
        })
      )
    },
    [validateRow]
  )

  // Delete a row
  const deleteRow = useCallback((rowId: string) => {
    setData((old) => {
      const filtered = old.filter((row) => row.id !== rowId)
      // Always keep at least one row
      return filtered.length === 0 ? [createEmptyRow()] : filtered
    })
  }, [])

  // Add a new row
  const addRow = useCallback(() => {
    setData((old) => [...old, createEmptyRow()])
  }, [])

  // Save a single row to Supabase
  const saveRow = useCallback(
    async (row: BulkEntryRow) => {
      if (!row.isValid) {
        toast({
          title: "Validation Error",
          description: row.errors.join(", "),
          variant: "destructive",
        })
        return
      }

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          toast({
            title: "Authentication Error",
            description: "Please log in to save transactions",
            variant: "destructive",
          })
          return
        }

        const { error } = await supabase.from("finances").insert({
          user_id: user.id,
          type: row.type,
          amount: parseFloat(row.amount),
          category: row.category.trim(),
          date: row.date,
          description: row.description.trim() || null,
        })

        if (error) throw error

        // Mark row as saved
        setData((old) =>
          old.map((r) => (r.id === row.id ? { ...r, isSaved: true } : r))
        )

        toast({
          title: "Success",
          description: "Transaction saved successfully",
        })
      } catch (error: any) {
        toast({
          title: "Save Error",
          description: error.message || "Failed to save transaction",
          variant: "destructive",
        })
      }
    },
    [toast]
  )

  // Save all valid unsaved rows
  const saveAllRows = useCallback(async () => {
    const unsavedRows = data.filter((row) => !row.isSaved && row.isValid)

    if (unsavedRows.length === 0) {
      toast({
        title: "No Changes",
        description: "All valid transactions are already saved",
      })
      return
    }

    setIsSavingAll(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Authentication Error",
          description: "Please log in to save transactions",
          variant: "destructive",
        })
        return
      }

      const transactions = unsavedRows.map((row) => ({
        user_id: user.id,
        type: row.type,
        amount: parseFloat(row.amount),
        category: row.category.trim(),
        date: row.date,
        description: row.description.trim() || null,
      }))

      const { error } = await supabase.from("finances").insert(transactions)

      if (error) throw error

      // Mark all as saved
      setData((old) =>
        old.map((row) =>
          unsavedRows.find((r) => r.id === row.id)
            ? { ...row, isSaved: true }
            : row
        )
      )

      toast({
        title: "Success",
        description: `${unsavedRows.length} transaction(s) saved successfully`,
      })

      // Refresh the page to show new transactions
      window.location.reload()
    } catch (error: any) {
      toast({
        title: "Save Error",
        description: error.message || "Failed to save transactions",
        variant: "destructive",
      })
    } finally {
      setIsSavingAll(false)
    }
  }, [data, toast])

  // Handle paste from clipboard (Excel/Sheets)
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData("text")

      if (!pastedText.trim()) return

      const lines = pastedText.split("\n").filter((line) => line.trim())
      const newRows: BulkEntryRow[] = []

      for (const line of lines) {
        const cells = line.split("\t") // Tab-separated (from Excel)
        
        if (cells.length >= 2) {
          // Try to parse: Type, Amount, Category, Date, Description
          const row = createEmptyRow()
          
          // Type (if matches, otherwise default to expense)
          const typeText = cells[0]?.toLowerCase().trim()
          if (typeText === "income" || typeText === "expense" || typeText === "investment") {
            row.type = typeText as TransactionType
          }
          
          // Amount
          const amountText = cells[1]?.replace(/[^\d.-]/g, "").trim()
          if (amountText) row.amount = amountText
          
          // Category
          if (cells[2]) row.category = cells[2].trim()
          
          // Date
          if (cells[3]) {
            const dateText = cells[3].trim()
            // Try to parse common date formats
            const parsedDate = new Date(dateText)
            if (!isNaN(parsedDate.getTime())) {
              row.date = parsedDate.toISOString().split("T")[0]
            }
          }
          
          // Description
          if (cells[4]) row.description = cells[4].trim()

          const validation = validateRow(row)
          row.isValid = validation.isValid
          row.errors = validation.errors

          newRows.push(row)
        }
      }

      if (newRows.length > 0) {
        setData((old) => {
          // Remove the last empty row if it's empty
          const lastRow = old[old.length - 1]
          const hasEmptyLast = lastRow && !lastRow.amount && !lastRow.category
          return hasEmptyLast ? [...old.slice(0, -1), ...newRows] : [...old, ...newRows]
        })

        toast({
          title: "Pasted",
          description: `Added ${newRows.length} row(s) from clipboard`,
        })
      }
    },
    [validateRow, toast]
  )

  // Define table columns
  const columns: ColumnDef<BulkEntryRow>[] = [
    {
      accessorKey: "type",
      header: "Type",
      size: 120,
      cell: ({ row }) => (
        <Select
          value={row.original.type}
          onValueChange={(value) =>
            updateCell(row.original.id, "type", value as TransactionType)
          }
          disabled={row.original.isSaved}
        >
          <SelectTrigger className="w-full h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="expense">Expense</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="investment">Investment</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      size: 120,
      cell: ({ row }) => (
        <Input
          type="number"
          step="0.01"
          value={row.original.amount}
          onChange={(e) => updateCell(row.original.id, "amount", e.target.value)}
          disabled={row.original.isSaved}
          className="h-9"
          placeholder="0.00"
        />
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      size: 150,
      cell: ({ row }) => (
        <Input
          value={row.original.category}
          onChange={(e) => updateCell(row.original.id, "category", e.target.value)}
          disabled={row.original.isSaved}
          className="h-9"
          placeholder="e.g., Food"
          list={`categories-${row.original.id}`}
        />
      ),
    },
    {
      accessorKey: "date",
      header: "Date",
      size: 140,
      cell: ({ row }) => (
        <Input
          type="date"
          value={row.original.date}
          onChange={(e) => updateCell(row.original.id, "date", e.target.value)}
          disabled={row.original.isSaved}
          className="h-9"
        />
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      size: 200,
      cell: ({ row }) => (
        <Input
          value={row.original.description}
          onChange={(e) => updateCell(row.original.id, "description", e.target.value)}
          disabled={row.original.isSaved}
          className="h-9"
          placeholder="Optional note"
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      size: 100,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {!row.original.isSaved && (
            <Button
              size="sm"
              variant={row.original.isValid ? "default" : "secondary"}
              onClick={() => saveRow(row.original)}
              disabled={!row.original.isValid}
              className="h-8 w-8 p-0"
              title={row.original.isValid ? "Save row" : row.original.errors.join(", ")}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {row.original.isSaved && (
            <div className="h-8 w-8 flex items-center justify-center">
              <Check className="h-4 w-4 text-green-600" />
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => deleteRow(row.original.id)}
            className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
            title="Delete row"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Auto-add new row when user fills the last one
  useEffect(() => {
    const lastRow = data[data.length - 1]
    if (lastRow && (lastRow.amount || lastRow.category) && !lastRow.isSaved) {
      const hasContent = data.some(row => !row.isSaved && (row.amount || row.category))
      if (hasContent) {
        // Check if we need a new empty row
        const emptyRows = data.filter(row => !row.amount && !row.category && !row.isSaved)
        if (emptyRows.length === 0) {
          addRow()
        }
      }
    }
  }, [data, addRow])

  const unsavedCount = data.filter((row) => !row.isSaved && row.isValid).length
  const invalidCount = data.filter((row) => !row.isSaved && !row.isValid && (row.amount || row.category)).length

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Total: {data.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Saved: {data.filter((r) => r.isSaved).length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Ready: {unsavedCount}</span>
          </div>
          {invalidCount > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Invalid: {invalidCount}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={addRow}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Row
          </Button>
          <Button
            size="sm"
            onClick={saveAllRows}
            disabled={unsavedCount === 0 || isSavingAll}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save All ({unsavedCount})
          </Button>
        </div>
      </div>

      {/* Paste Helper */}
      <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Upload className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
          <div>
            <strong>Paste from Excel:</strong> Copy rows from Excel/Sheets and paste directly into the table below.
            Format: Type | Amount | Category | Date | Description
          </div>
        </div>
      </div>

      {/* Table */}
      <div
        ref={tableRef}
        onPaste={handlePaste}
        className="border rounded-lg overflow-hidden bg-card"
        tabIndex={0}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className="px-3 py-3 text-left text-sm font-medium text-muted-foreground"
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-t transition-colors",
                    row.original.isSaved
                      ? "bg-green-50/50 dark:bg-green-950/10"
                      : !row.original.isValid && (row.original.amount || row.original.category)
                      ? "bg-red-50/50 dark:bg-red-950/10"
                      : "hover:bg-muted/50"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Datalist for category suggestions */}
        {data.map((row) => (
          <datalist key={row.id} id={`categories-${row.id}`}>
            {COMMON_CATEGORIES.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
        ))}
      </div>
    </div>
  )
}
