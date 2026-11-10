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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { PiggyBank, Loader2, Sparkles } from "lucide-react"
import type { FinancialGoal } from "@/lib/types/finance"

interface AddGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingGoal?: FinancialGoal | null
  onSaved: () => void
}

const GOAL_CATEGORIES = [
  "Emergency Fund",
  "Savings",
  "Gadgets & Tech",
  "Travel & Vacation",
  "Vehicle",
  "Home & Living",
  "Investment",
  "Education",
  "Debt Payoff",
  "Other",
]

const COLOR_PRESETS = [
  { name: "Ocean Blue", value: "#3b82f6" },
  { name: "Emerald Green", value: "#10b981" },
  { name: "Violet Purple", value: "#8b5cf6" },
  { name: "Amber Orange", value: "#f59e0b" },
  { name: "Rose Pink", value: "#ec4899" },
  { name: "Cyan Teal", value: "#06b6d4" },
]

export function AddGoalDialog({
  open,
  onOpenChange,
  existingGoal,
  onSaved,
}: AddGoalDialogProps) {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [category, setCategory] = useState("Savings")
  const [color, setColor] = useState("#3b82f6")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (existingGoal) {
      setTitle(existingGoal.title)
      setTargetAmount(existingGoal.targetAmount.toString())
      setCurrentAmount(existingGoal.currentAmount.toString())
      setTargetDate(
        existingGoal.targetDate
          ? new Date(existingGoal.targetDate).toISOString().split("T")[0]
          : ""
      )
      setCategory(existingGoal.category || "Savings")
      setColor(existingGoal.color || "#3b82f6")
      setNotes(existingGoal.notes || "")
    } else {
      setTitle("")
      setTargetAmount("")
      setCurrentAmount("0")
      setTargetDate("")
      setCategory("Savings")
      setColor("#3b82f6")
      setNotes("")
    }
  }, [existingGoal, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a name for your financial goal.",
        variant: "destructive",
      })
      return
    }

    const numericTarget = parseFloat(targetAmount)
    if (isNaN(numericTarget) || numericTarget <= 0) {
      toast({
        title: "Invalid Target Amount",
        description: "Target amount must be a positive number.",
        variant: "destructive",
      })
      return
    }

    const numericCurrent = parseFloat(currentAmount) || 0

    setIsSubmitting(true)
    try {
      const isEditing = Boolean(existingGoal?.id)
      const url = "/api/finance/goals"
      const method = isEditing ? "PUT" : "POST"

      const payload: any = {
        title: title.trim(),
        targetAmount: numericTarget,
        currentAmount: numericCurrent,
        targetDate: targetDate || null,
        category,
        color,
        notes: notes.trim() || null,
      }

      if (isEditing) {
        payload.id = existingGoal!.id
      }

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to save goal")
      }

      toast({
        title: isEditing ? "Goal Updated" : "Goal Created",
        description: `Target of ₹${numericTarget.toLocaleString("en-IN")} set for "${title}".`,
      })

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Save goal error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save goal",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: color }}
            >
              <PiggyBank className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">
              {existingGoal ? "Edit Savings Goal" : "Create Savings Goal"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Track your sinking funds and milestones with target amounts and estimated deadlines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Goal Title */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Goal Name
            </Label>
            <Input
              placeholder="e.g. Emergency Fund (6 Months), Trip to Tokyo"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Target Amount & Initial Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Amount (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="50000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="pl-8 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Current Saved (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          {/* Category & Target Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Target Date (Optional)
              </Label>
              <Input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Color Tag Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Card Theme Color
            </Label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setColor(p.value)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === p.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: p.value }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Notes / Strategy (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Save ₹5,000 every month on payday into high-yield savings."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
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
                  {existingGoal ? "Save Changes" : "Create Goal"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
