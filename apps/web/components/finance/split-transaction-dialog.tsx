"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Split, Plus, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react"
import type { Transaction } from "@/lib/types/finance"

interface SplitTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  categories: string[]
  onSaved: () => void
}

interface SplitRow {
  id: string
  category: string
  amount: string
  description: string
}

export function SplitTransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  onSaved,
}: SplitTransactionDialogProps) {
  const { toast } = useToast()
  const [splits, setSplits] = useState<SplitRow[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parentTotal = transaction ? parseFloat(transaction.amount.toString()) : 0

  const availableCategories = Array.from(
    new Set([
      "Food & Dining",
      "Groceries",
      "Shopping",
      "Transportation",
      "Utilities & Bills",
      "Healthcare",
      "Entertainment",
      "Personal Care",
      "Education",
      "Other",
      ...categories,
    ])
  ).sort()

  useEffect(() => {
    if (transaction) {
      const half = (parentTotal / 2).toFixed(2)
      const otherHalf = (parentTotal - parseFloat(half)).toFixed(2)

      setSplits([
        {
          id: "1",
          category: transaction.category || availableCategories[0],
          amount: half,
          description: transaction.description || "",
        },
        {
          id: "2",
          category: availableCategories[1] || "Shopping",
          amount: otherHalf,
          description: "",
        },
      ])
    }
  }, [transaction, open])

  const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0)
  const remaining = Math.round((parentTotal - totalSplitAmount) * 100) / 100
  const isBalanced = Math.abs(remaining) <= 0.01

  const addSplitRow = () => {
    const nextAmount = Math.max(0, remaining).toFixed(2)
    setSplits([
      ...splits,
      {
        id: Math.random().toString(),
        category: availableCategories[splits.length % availableCategories.length],
        amount: nextAmount,
        description: "",
      },
    ])
  }

  const removeSplitRow = (index: number) => {
    if (splits.length <= 2) {
      toast({
        title: "Minimum 2 Splits",
        description: "A split transaction must have at least 2 categories.",
        variant: "destructive",
      })
      return
    }
    setSplits(splits.filter((_, i) => i !== index))
  }

  const updateSplit = (index: number, field: keyof SplitRow, value: string) => {
    const copy = [...splits]
    copy[index] = { ...copy[index], [field]: value }
    setSplits(copy)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!transaction) return

    if (!isBalanced) {
      toast({
        title: "Split Sum Mismatch",
        description: `Total split sum must equal ₹${parentTotal.toFixed(2)}. Difference: ₹${remaining.toFixed(2)}.`,
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/finance/transactions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "split",
          parentId: transaction.id,
          splits: splits.map((s) => ({
            category: s.category,
            amount: parseFloat(s.amount),
            description: s.description || transaction.description,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to split transaction")
      }

      toast({
        title: "Transaction Split",
        description: `Successfully divided into ${splits.length} category entries.`,
      })

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Split save error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to split transaction",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!transaction) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Split className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">Split Transaction</DialogTitle>
          </div>
          <DialogDescription>
            Divide <strong>{transaction.description}</strong> into multiple categories.
          </DialogDescription>
        </DialogHeader>

        {/* Parent Summary Card */}
        <div className="p-3 rounded-lg bg-secondary/50 border flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground">Original Transaction:</span>
            <p className="font-bold text-sm text-foreground">{transaction.description}</p>
          </div>
          <div className="text-right">
            <span className="text-muted-foreground">Total Bill:</span>
            <p className="font-bold text-base text-foreground">
              ₹{parentTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Split Rows */}
          <div className="space-y-3">
            {splits.map((s, idx) => (
              <div
                key={s.id}
                className="p-3 rounded-lg border bg-card/60 space-y-2 relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Split #{idx + 1}
                  </span>
                  {splits.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSplitRow(idx)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Category
                    </Label>
                    <Select
                      value={s.category}
                      onValueChange={(val) => updateSplit(idx, "category", val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                      Amount (₹)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={s.amount}
                      onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                      className="h-8 text-xs font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Input
                    placeholder="Specific item note (e.g. Groceries portion, Electronics)"
                    value={s.description}
                    onChange={(e) => updateSplit(idx, "description", e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSplitRow}
            className="w-full gap-1.5 text-xs font-bold uppercase tracking-wider h-8 border-dashed"
          >
            <Plus className="w-3.5 h-3.5" /> Add Another Split Category
          </Button>

          {/* Allocation Balance Checker */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
              isBalanced
                ? "bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900 text-green-700 dark:text-green-300"
                : "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300"
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isBalanced ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="font-semibold">
                {isBalanced
                  ? "Perfect Match: Full amount allocated"
                  : remaining > 0
                  ? `₹${remaining.toFixed(2)} unallocated`
                  : `₹${Math.abs(remaining).toFixed(2)} over allocated`}
              </span>
            </div>
            <span className="font-bold">
              ₹{totalSplitAmount.toFixed(2)} / ₹{parentTotal.toFixed(2)}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isBalanced || isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Splitting...
                </>
              ) : (
                <>
                  <Split className="w-4 h-4" />
                  Confirm Split
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
