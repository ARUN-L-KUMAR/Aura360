"use client"

import { useState } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { ArrowUpRight, Loader2, Sparkles, Trophy } from "lucide-react"
import type { FinancialGoal } from "@/lib/types/finance"

interface ContributeGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: FinancialGoal | null
  onSaved: () => void
}

export function ContributeGoalDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: ContributeGoalDialogProps) {
  const { toast } = useToast()
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!goal) return null

  const targetAmount = parseFloat(goal.targetAmount.toString())
  const currentAmount = parseFloat(goal.currentAmount.toString())
  const contribNumber = parseFloat(amount) || 0
  const newCurrent = currentAmount + contribNumber
  const newPercentage = targetAmount > 0 ? Math.min(100, Math.round((newCurrent / targetAmount) * 100)) : 0
  const willComplete = newCurrent >= targetAmount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isNaN(contribNumber) || contribNumber <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid contribution amount.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/finance/goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: goal.id,
          contributeAmount: contribNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to add funds")
      }

      toast({
        title: willComplete ? "🎉 Goal Milestone Reached!" : "Funds Contributed",
        description: `Added ₹${contribNumber.toLocaleString("en-IN")} to "${goal.title}". New balance: ₹${newCurrent.toLocaleString("en-IN")}.`,
      })

      setAmount("")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Contribute goal error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add funds",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: goal.color || "#3b82f6" }}
            >
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">Add Funds to Goal</DialogTitle>
          </div>
          <DialogDescription>
            Deposit savings toward <strong>{goal.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Amount input */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Deposit Amount (₹)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                type="number"
                step="1"
                min="1"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8 text-xl font-bold"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Quick Amount Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {[1000, 2000, 5000, 10000].map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
                className="text-xs h-7 px-2.5 font-semibold"
              >
                +₹{preset.toLocaleString("en-IN")}
              </Button>
            ))}
          </div>

          {/* Live Progress Preview */}
          <div className="p-3 rounded-lg bg-secondary/50 border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Projected Balance:</span>
              <span className="font-bold">
                ₹{newCurrent.toLocaleString("en-IN")} / ₹{targetAmount.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${newPercentage}%`,
                  backgroundColor: goal.color || "#3b82f6",
                }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{newPercentage}% achieved</span>
              {willComplete ? (
                <span className="text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Target Complete!
                </span>
              ) : (
                <span>₹{Math.max(0, targetAmount - newCurrent).toLocaleString("en-IN")} left</span>
              )}
            </div>
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
                  Updating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Deposit Funds
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
