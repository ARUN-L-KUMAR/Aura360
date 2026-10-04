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
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/hooks/use-toast"
import { Target, Loader2, Sparkles, AlertCircle } from "lucide-react"
import type { BudgetWithSpend } from "@/lib/types/finance"

interface EditBudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingBudget?: BudgetWithSpend | null
  existingCategories: string[]
  currentMonth: string
  onSaved: () => void
}

const COMMON_CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Shopping",
  "Entertainment",
  "Transportation",
  "Utilities & Bills",
  "Healthcare",
  "Personal Care",
  "Travel",
  "Education",
]

export function EditBudgetDialog({
  open,
  onOpenChange,
  existingBudget,
  existingCategories,
  currentMonth,
  onSaved,
}: EditBudgetDialogProps) {
  const { toast } = useToast()
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [amount, setAmount] = useState("")
  const [alertThreshold, setAlertThreshold] = useState(80)
  const [isOverall, setIsOverall] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Merge categories
  const allCategories = Array.from(
    new Set([...COMMON_CATEGORIES, ...existingCategories.filter((c) => c !== "__OVERALL__")])
  ).sort()

  useEffect(() => {
    if (existingBudget) {
      const isOverallBudget = existingBudget.category === "__OVERALL__"
      setIsOverall(isOverallBudget)
      if (isOverallBudget) {
        setCategory("__OVERALL__")
      } else if (allCategories.includes(existingBudget.category)) {
        setCategory(existingBudget.category)
      } else {
        setCategory("CUSTOM")
        setCustomCategory(existingBudget.category)
      }
      setAmount(existingBudget.amount.toString())
      setAlertThreshold(existingBudget.alertThreshold || 80)
    } else {
      setCategory(isOverall ? "__OVERALL__" : allCategories[0] || "Food & Dining")
      setCustomCategory("")
      setAmount("")
      setAlertThreshold(80)
    }
  }, [existingBudget, open, isOverall])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    const targetCategory = isOverall
      ? "__OVERALL__"
      : category === "CUSTOM"
      ? customCategory.trim()
      : category.trim()

    if (!targetCategory) {
      toast({
        title: "Category Required",
        description: "Please select or enter a category name.",
        variant: "destructive",
      })
      return
    }

    const numericAmount = parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid positive budget amount.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: targetCategory,
          amount: numericAmount,
          month: currentMonth,
          alertThreshold,
          period: "monthly",
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save budget")
      }

      toast({
        title: existingBudget ? "Budget Updated" : "Budget Set",
        description: `₹${numericAmount.toLocaleString("en-IN")} allocated for ${
          targetCategory === "__OVERALL__" ? "Overall Monthly Spend" : targetCategory
        }.`,
      })

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Save budget error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save budget",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Target className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">
              {existingBudget ? "Modify Budget" : "Set Spending Limit"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Allocate monthly spending caps and receive early warnings before overspending.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Budget Scope Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-secondary rounded-lg border">
            <button
              type="button"
              onClick={() => {
                setIsOverall(false)
                if (category === "__OVERALL__") setCategory(allCategories[0] || "Food & Dining")
              }}
              className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                !isOverall
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Category Limit
            </button>
            <button
              type="button"
              onClick={() => {
                setIsOverall(true)
                setCategory("__OVERALL__")
              }}
              className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                isOverall
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Overall Month Cap
            </button>
          </div>

          {/* Category Selector if not Overall */}
          {!isOverall && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">+ Custom Category...</SelectItem>
                </SelectContent>
              </Select>

              {category === "CUSTOM" && (
                <Input
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Budget (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="e.g. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-lg font-bold"
                required
              />
            </div>
          </div>

          {/* Alert Threshold Slider */}
          <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                Warning Alert Threshold
              </Label>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-background border">
                {alertThreshold}%
              </span>
            </div>
            <Slider
              value={[alertThreshold]}
              onValueChange={(val) => setAlertThreshold(val[0])}
              min={50}
              max={95}
              step={5}
              className="py-1"
            />
            <p className="text-[11px] text-muted-foreground">
              We will highlight the budget card in warning amber when spending reaches {alertThreshold}% of this limit.
            </p>
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
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {existingBudget ? "Update Budget" : "Set Budget"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
