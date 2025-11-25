'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, AlertCircle, Check } from 'lucide-react'
import type { ParsedExcelRow, TransactionType } from '@/lib/types/finance'
import { cn } from '@/lib/utils'

interface ExcelDataTableProps {
  data: ParsedExcelRow[]
  onUpdateRow: (index: number, row: ParsedExcelRow) => void
  onDeleteRow: (index: number) => void
  onAddRow: () => void
}

const TRANSACTION_TYPES: TransactionType[] = ['expense', 'income', 'investment', 'transfer']

const COMMON_CATEGORIES = [
  'food',
  'transport',
  'shopping',
  'entertainment',
  'bills',
  'healthcare',
  'education',
  'rent',
  'salary',
  'investment',
  'miscellaneous'
]

export function ExcelDataTable({ data, onUpdateRow, onDeleteRow }: ExcelDataTableProps) {
  const [page, setPage] = useState(0)
  const rowsPerPage = 10
  
  const paginatedData = data.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const totalPages = Math.ceil(data.length / rowsPerPage)

  const validateRow = (row: Partial<ParsedExcelRow>): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (!row.type) errors.push('Type is required')
    if (!row.amount || row.amount <= 0) errors.push('Amount must be positive')
    if (!row.category || row.category.trim() === '') errors.push('Category is required')
    if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('Valid date required (YYYY-MM-DD)')
    if (!row.description || row.description.trim() === '') errors.push('Description is required')
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const handleCellChange = (
    index: number,
    field: keyof ParsedExcelRow,
    value: any
  ) => {
    const actualIndex = page * rowsPerPage + index
    const row = data[actualIndex]
    const updatedRow = { ...row, [field]: value }
    
    // Revalidate
    const validation = validateRow(updatedRow)
    updatedRow.isValid = validation.isValid
    updatedRow.validationErrors = validation.errors
    updatedRow.needs_review = !validation.isValid
    
    onUpdateRow(actualIndex, updatedRow)
  }

  const handleDelete = (index: number) => {
    const actualIndex = page * rowsPerPage + index
    onDeleteRow(actualIndex)
  }

  return (
    <div className="space-y-4">
      {/* Table Container with Horizontal Scroll */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-12">Status</TableHead>
                <TableHead className="min-w-[120px]">Type</TableHead>
                <TableHead className="min-w-[100px]">Amount</TableHead>
                <TableHead className="min-w-[150px]">Category</TableHead>
                <TableHead className="min-w-[130px]">Date</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    'group',
                    !row.isValid && 'bg-orange-50 dark:bg-orange-950/20'
                  )}
                >
                  {/* Row Number */}
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {page * rowsPerPage + index + 1}
                  </TableCell>

                  {/* Validation Status */}
                  <TableCell>
                    {row.isValid ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="relative group/tooltip">
                        <AlertCircle className="h-4 w-4 text-orange-600 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover/tooltip:block z-50">
                          <div className="bg-popover text-popover-foreground p-2 rounded-md shadow-md border text-xs whitespace-nowrap">
                            {row.validationErrors.map((error, i) => (
                              <div key={i}>• {error}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* Type */}
                  <TableCell>
                    <Select
                      value={row.type}
                      onValueChange={(value) => handleCellChange(index, 'type', value as TransactionType)}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRANSACTION_TYPES.map(type => (
                          <SelectItem key={type} value={type}>
                            <span className="capitalize">{type}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>

                  {/* Amount */}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.amount}
                      onChange={(e) => handleCellChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      className={cn(
                        'h-8',
                        (!row.amount || row.amount <= 0) && 'border-orange-500'
                      )}
                    />
                  </TableCell>

                  {/* Category */}
                  <TableCell>
                    <Input
                      value={row.category}
                      onChange={(e) => handleCellChange(index, 'category', e.target.value)}
                      list={`categories-${index}`}
                      className={cn(
                        'h-8',
                        !row.category.trim() && 'border-orange-500'
                      )}
                      placeholder="Enter category"
                    />
                    <datalist id={`categories-${index}`}>
                      {COMMON_CATEGORIES.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </TableCell>

                  {/* Date */}
                  <TableCell>
                    <Input
                      type="date"
                      value={row.date}
                      onChange={(e) => handleCellChange(index, 'date', e.target.value)}
                      className={cn(
                        'h-8',
                        (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) && 'border-orange-500'
                      )}
                    />
                  </TableCell>

                  {/* Description */}
                  <TableCell>
                    <Input
                      value={row.description}
                      onChange={(e) => handleCellChange(index, 'description', e.target.value)}
                      className={cn(
                        'h-8',
                        !row.description.trim() && 'border-orange-500'
                      )}
                      placeholder="Enter description"
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDelete(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, data.length)} of {data.length} transactions
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => (
                <Button
                  key={i}
                  variant={page === i ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setPage(i)}
                >
                  {i + 1}
                </Button>
              )).slice(
                Math.max(0, page - 2),
                Math.min(totalPages, page + 3)
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-3 w-3 text-green-600" />
          <span>Valid</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3 text-orange-600" />
          <span>Needs Review (hover for details)</span>
        </div>
        <div className="flex items-center gap-2">
          <Trash2 className="h-3 w-3" />
          <span>Delete (hover row to show)</span>
        </div>
      </div>
    </div>
  )
}
