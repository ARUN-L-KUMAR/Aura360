"use client"

import { useState, useRef, useCallback, useMemo, useEffect } from "react"
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Check, Trash2, Plus, Upload, Save, ChevronDown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface IncomeRow {
  id: string
  amount: string
  category: string
  date: string
  description: string
  isSaved: boolean
  isValid: boolean
  errors: string[]
}

const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Business",
  "Investment Returns",
  "Rental Income",
  "Bonus",
  "Gift",
  "Refund",
  "Other",
]

interface IncomeEntryTableProps {
  onTransactionsSaved?: () => void
}

// Editable Cell Component - defined outside to prevent re-creation
function EditableCell({
  value,
  rowId,
  columnId,
  onChange,
  disabled,
  type = "text",
  placeholder,
}: {
  value: string
  rowId: string
  columnId: string
  onChange: (rowId: string, columnId: string, value: string) => void
  disabled: boolean
  type?: string
  placeholder?: string
}) {
  return (
    <Input
      type={type}
      step={type === "number" ? "0.01" : undefined}
      value={value}
      onChange={(e) => onChange(rowId, columnId, e.target.value)}
      disabled={disabled}
      className="h-9"
      placeholder={placeholder}
    />
  )
}

// Category ComboCell - allows both typing and selecting from dropdown
function CategoryComboCell({
  value,
  rowId,
  onChange,
  disabled,
  categories,
  placeholder,
}: {
  value: string
  rowId: string
  onChange: (rowId: string, columnId: string, value: string) => void
  disabled: boolean
  categories: string[]
  placeholder?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync inputValue with value prop
  useEffect(() => {
    setInputValue(value)
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredCategories = categories.filter((cat) =>
    cat.toLowerCase().includes(inputValue.toLowerCase())
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(rowId, "category", newValue)
    setIsOpen(true)
  }

  const handleSelectCategory = (category: string) => {
    setInputValue(category)
    onChange(rowId, "category", category)
    setIsOpen(false)
  }

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen)
      if (!isOpen) {
        inputRef.current?.focus()
      }
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          disabled={disabled}
          className="h-9 pr-8"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="absolute right-0 h-9 w-8 flex items-center justify-center hover:bg-accent/50 rounded-r-md transition-colors"
          onClick={toggleDropdown}
          disabled={disabled}
          tabIndex={-1}
        >
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>
      {isOpen && filteredCategories.length > 0 && (
        <div className="absolute z-[100] mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredCategories.map((category) => (
            <div
              key={category}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => handleSelectCategory(category)}
            >
              {category}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function IncomeEntryTable({ onTransactionsSaved }: IncomeEntryTableProps) {
  const { toast } = useToast()
  const [data, setData] = useState<IncomeRow[]>([createEmptyRow()])
  const [isSavingAll, setIsSavingAll] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  function createEmptyRow(): IncomeRow {
    return {
      id: `temp-${Date.now()}-${Math.random()}`,
      amount: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      isSaved: false,
      isValid: false,
      errors: [],
    }
  }

  const validateRow = useCallback((row: IncomeRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    if (!row.amount || parseFloat(row.amount) <= 0) errors.push("Amount must be greater than 0")
    if (!row.category.trim()) errors.push("Category is required")
    if (!row.date) errors.push("Date is required")
    if (row.date && isNaN(new Date(row.date).getTime())) errors.push("Invalid date format")
    return { isValid: errors.length === 0, errors }
  }, [])

  const updateCell = useCallback(
    (rowId: string, columnId: string, value: string) => {
      setData((old) =>
        old.map((row) => {
          if (row.id === rowId) {
            const updated = { ...row, [columnId]: value, isSaved: false }
            const validation = validateRow(updated)
            return { ...updated, isValid: validation.isValid, errors: validation.errors }
          }
          return row
        })
      )
    },
    [validateRow]
  )

  const deleteRow = useCallback((rowId: string) => {
    setData((old) => {
      const filtered = old.filter((row) => row.id !== rowId)
      return filtered.length === 0 ? [createEmptyRow()] : filtered
    })
  }, [])

  const addRow = useCallback(() => {
    setData((old) => [...old, createEmptyRow()])
  }, [])

  const saveRow = useCallback(
    async (row: IncomeRow) => {
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
        const { data: { user } } = await supabase.auth.getUser()

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
          type: "income",
          amount: parseFloat(row.amount),
          category: row.category.trim(),
          date: row.date,
          description: row.description.trim() || null,
          payment_method: "bank_transfer",
        })

        if (error) throw error

        setData((old) => old.map((r) => (r.id === row.id ? { ...r, isSaved: true } : r)))

        toast({
          title: "Success",
          description: "Income saved successfully",
        })
        
        // Notify parent to refresh
        onTransactionsSaved?.()
      } catch (error: any) {
        toast({
          title: "Save Error",
          description: error.message || "Failed to save income",
          variant: "destructive",
        })
      }
    },
    [toast, onTransactionsSaved]
  )

  const saveAllRows = useCallback(async () => {
    const unsavedRows = data.filter((row) => !row.isSaved && row.isValid)

    if (unsavedRows.length === 0) {
      toast({
        title: "No Changes",
        description: "All valid income entries are already saved",
      })
      return
    }

    setIsSavingAll(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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
        type: "income" as const,
        amount: parseFloat(row.amount),
        category: row.category.trim(),
        date: row.date,
        description: row.description.trim() || null,
        payment_method: "bank_transfer",
      }))

      const { error } = await supabase.from("finances").insert(transactions)

      if (error) throw error

      setData((old) =>
        old.map((row) =>
          unsavedRows.find((r) => r.id === row.id) ? { ...row, isSaved: true } : row
        )
      )

      toast({
        title: "Success",
        description: `${unsavedRows.length} income(s) saved successfully`,
      })

      // Reset the table and notify parent
      setData([createEmptyRow()])
      onTransactionsSaved?.()
    } catch (error: any) {
      toast({
        title: "Save Error",
        description: error.message || "Failed to save incomes",
        variant: "destructive",
      })
    } finally {
      setIsSavingAll(false)
    }
  }, [data, toast, onTransactionsSaved])

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      e.preventDefault()
      const pastedText = e.clipboardData.getData("text")
      if (!pastedText.trim()) return

      const lines = pastedText.split("\n").filter((line) => line.trim())
      const newRows: IncomeRow[] = []

      for (const line of lines) {
        const cells = line.split("\t")
        if (cells.length >= 1) {
          const row = createEmptyRow()
          const amountText = cells[0]?.replace(/[^\d.-]/g, "").trim()
          if (amountText) row.amount = amountText
          if (cells[1]) row.category = cells[1].trim()
          if (cells[2]) {
            const parsedDate = new Date(cells[2].trim())
            if (!isNaN(parsedDate.getTime())) {
              row.date = parsedDate.toISOString().split("T")[0]
            }
          }
          if (cells[3]) row.description = cells[3].trim()

          const validation = validateRow(row)
          row.isValid = validation.isValid
          row.errors = validation.errors
          newRows.push(row)
        }
      }

      if (newRows.length > 0) {
        setData((old) => {
          const lastRow = old[old.length - 1]
          const hasEmptyLast = lastRow && !lastRow.amount && !lastRow.category
          return hasEmptyLast ? [...old.slice(0, -1), ...newRows] : [...old, ...newRows]
        })

        toast({
          title: "Pasted",
          description: `Added ${newRows.length} income row(s)`,
        })
      }
    },
    [validateRow, toast]
  )

  // Memoize columns to prevent re-renders
  const columns = useMemo<ColumnDef<IncomeRow>[]>(
    () => [
      {
        accessorKey: "amount",
        header: "Amount",
        size: 150,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.amount}
            rowId={row.original.id}
            columnId="amount"
            onChange={updateCell}
            disabled={row.original.isSaved}
            type="number"
            placeholder="0.00"
          />
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 200,
        cell: ({ row }) => (
          <CategoryComboCell
            value={row.original.category}
            rowId={row.original.id}
            onChange={updateCell}
            disabled={row.original.isSaved}
            categories={INCOME_CATEGORIES}
            placeholder="Type or select..."
          />
        ),
      },
      {
        accessorKey: "date",
        header: "Date",
        size: 150,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.date}
            rowId={row.original.id}
            columnId="date"
            onChange={updateCell}
            disabled={row.original.isSaved}
            type="date"
          />
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        size: 250,
        cell: ({ row }) => (
          <EditableCell
            value={row.original.description}
            rowId={row.original.id}
            columnId="description"
            onChange={updateCell}
            disabled={row.original.isSaved}
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
    ],
    [updateCell, saveRow, deleteRow]
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const unsavedCount = data.filter((row) => !row.isSaved && row.isValid).length
  const invalidCount = data.filter((row) => !row.isSaved && !row.isValid && (row.amount || row.category)).length

  return (
    <div className="space-y-4">
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
          <Button size="sm" variant="outline" onClick={addRow} className="gap-2">
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

      <div className="text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <Upload className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400" />
          <div>
            <strong>Paste from Excel:</strong> Format: Amount | Category | Date | Description
          </div>
        </div>
      </div>

      <div ref={tableRef} onPaste={handlePaste} className="border rounded-lg overflow-hidden bg-card" tabIndex={0}>
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
                      {flexRender(header.column.columnDef.header, header.getContext())}
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
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
