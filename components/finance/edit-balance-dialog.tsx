"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface EditBalanceDialogProps {
  initialCashBalance: number
  initialAccountBalance: number
  onBalanceUpdated: () => void
}

export function EditBalanceDialog({
  initialCashBalance,
  initialAccountBalance,
  onBalanceUpdated,
}: EditBalanceDialogProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [cashBalance, setCashBalance] = useState(initialCashBalance.toString())
  const [accountBalance, setAccountBalance] = useState(initialAccountBalance.toString())
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const validateInputs = () => {
    const newErrors: { [key: string]: string } = {}

    const cashNum = parseFloat(cashBalance)
    const accountNum = parseFloat(accountBalance)

    if (isNaN(cashNum)) {
      newErrors.cash = "Please enter a valid number"
    } else if (cashNum < 0) {
      newErrors.cash = "Cash balance cannot be negative"
    }

    if (isNaN(accountNum)) {
      newErrors.account = "Please enter a valid number"
    } else if (accountNum < 0) {
      newErrors.account = "Account balance cannot be negative"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateInputs()) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/finance/balances", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cash_balance: parseFloat(cashBalance),
          account_balance: parseFloat(accountBalance),
        }),
      })

      const result = await response.json()

      if (response.status === 503) {
        toast.error("⚠️ Balance table not initialized. Please run the SQL migration first.")
        return
      }

      if (!response.ok) {
        toast.error(result.error || "Failed to update balance")
        return
      }

      toast.success("✅ Balances updated successfully!")
      setOpen(false)
      onBalanceUpdated()
    } catch (error) {
      console.error("Error updating balance:", error)
      toast.error("Failed to update balance")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to initial values when opening
      setCashBalance(initialCashBalance.toString())
      setAccountBalance(initialAccountBalance.toString())
      setErrors({})
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size={isMobile ? "sm" : "sm"} className="gap-2">
          {isMobile ? "Edit" : "Edit Balances"}
        </Button>
      </DialogTrigger>
      <DialogContent className={cn(
        "sm:max-w-[425px]",
        isMobile && "max-h-[90vh] overflow-y-auto"
      )}>
        <DialogHeader>
          <DialogTitle className={cn("flex items-center gap-2", isMobile && "text-base")}>
            <AlertCircle className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
            Update Real Balances
          </DialogTitle>
          <DialogDescription className={cn(isMobile && "text-xs")}>
            Enter your actual account balance (GPay/UPI) and cash in hand to calculate the mismatch with your recorded finances.
          </DialogDescription>
        </DialogHeader>

        <div className={cn("space-y-6 py-6", isMobile && "space-y-4 py-4")}>
          {/* Account Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="account-balance" className={cn("flex items-center gap-2", isMobile && "text-xs")}>
              <span>💳 Account Balance (GPay)</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>₹</span>
              <Input
                id="account-balance"
                type="number"
                placeholder="0.00"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                step="0.01"
                min="0"
                className={errors.account ? "border-red-500" : ""}
                disabled={isLoading}
              />
            </div>
            {errors.account && (
              <p className={cn("text-red-500", isMobile ? "text-xs" : "text-sm")}>{errors.account}</p>
            )}
          </div>

          {/* Cash Balance Input */}
          <div className="space-y-2">
            <Label htmlFor="cash-balance" className={cn("flex items-center gap-2", isMobile && "text-xs")}>
              <span>💵 Cash in Hand</span>
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn("font-semibold", isMobile ? "text-base" : "text-lg")}>₹</span>
              <Input
                id="cash-balance"
                type="number"
                placeholder="0.00"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                step="0.01"
                min="0"
                className={errors.cash ? "border-red-500" : ""}
                disabled={isLoading}
              />
            </div>
            {errors.cash && (
              <p className={cn("text-red-500", isMobile ? "text-xs" : "text-sm")}>{errors.cash}</p>
            )}
          </div>

          {/* Total Real Balance Preview */}
          <div className={cn(
            "bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800",
            isMobile ? "p-3" : "p-4"
          )}>
            <p className={cn("text-muted-foreground mb-1", isMobile ? "text-xs" : "text-sm")}>Total Real Balance</p>
            <p className={cn("font-bold text-blue-600 dark:text-blue-400", isMobile ? "text-xl" : "text-2xl")}>
              ₹
              {(
                parseFloat(accountBalance || "0") +
                parseFloat(cashBalance || "0")
              ).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} size={isMobile ? "sm" : "default"} className="gap-2">
            {isLoading && <Loader2 className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "animate-spin")} />}
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
