"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { TrendingUp, TrendingDown, PiggyBank, IndianRupee, Calendar, Tag, FileText, Wallet, CreditCard, Banknote, Smartphone, Building2 } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

// Payment method options
const paymentMethods = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "other", label: "Other", icon: Wallet },
]

// Category suggestions based on type
const categoryOptions = {
  income: ["Salary", "Freelance", "Business", "Scholarship", "Gift", "Interest", "Refund", "Other Income"],
  expense: ["Food", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Education", "Rent", "Groceries", "Other"],
  investment: ["Stocks", "Mutual Funds", "SIP", "Fixed Deposit", "Gold", "Crypto", "Real Estate", "Other Investment"],
}

interface Transaction {
  id: string
  user_id: string
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  description: string | null
  payment_method: string | null
  date: string
  created_at: string
  updated_at: string
}

interface EditTransactionDialogProps {
  transaction: Transaction
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (transaction: Transaction) => void
}

export function EditTransactionDialog({ transaction, open, onOpenChange, onUpdate }: EditTransactionDialogProps) {
  const isMobile = useIsMobile()
  const [type, setType] = useState<"income" | "expense" | "investment">(transaction.type)
  const [amount, setAmount] = useState(transaction.amount.toString())
  const [category, setCategory] = useState(transaction.category)
  const [customCategory, setCustomCategory] = useState("")
  const [paymentMethod, setPaymentMethod] = useState(transaction.payment_method || "upi")
  const [description, setDescription] = useState(transaction.description || "")
  const [date, setDate] = useState(transaction.date)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setType(transaction.type)
    setAmount(transaction.amount.toString())
    // Check if category is in the predefined list
    const isCustom = !categoryOptions[transaction.type].includes(transaction.category)
    if (isCustom) {
      setCategory("custom")
      setCustomCategory(transaction.category)
    } else {
      setCategory(transaction.category)
      setCustomCategory("")
    }
    setPaymentMethod(transaction.payment_method || "upi")
    setDescription(transaction.description || "")
    setDate(transaction.date)
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const finalCategory = category === "custom" ? customCategory : category

      const response = await fetch(`/api/finance/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type,
          amount: Number.parseFloat(amount),
          category: finalCategory,
          paymentMethod: paymentMethod,
          description: description || null,
          date,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to update transaction")
      }

      onUpdate(result.data)
      onOpenChange(false)
    } catch (error: any) {
      console.error("[v0] Error updating transaction:", error)
      alert(error.message || "Failed to update transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (transactionType: string) => {
    switch (transactionType) {
      case "income":
        return <TrendingUp className="h-4 w-4" />
      case "expense":
        return <TrendingDown className="h-4 w-4" />
      case "investment":
        return <PiggyBank className="h-4 w-4" />
      default:
        return null
    }
  }

  const getTypeColor = (transactionType: string) => {
    switch (transactionType) {
      case "income":
        return "text-green-600 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
      case "expense":
        return "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
      case "investment":
        return "text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800"
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[500px]",
        isMobile && "max-h-[90vh] overflow-y-auto"
      )}>
        <form onSubmit={handleSubmit}>
          <DialogHeader className={cn("pb-4", isMobile && "pb-2")}>
            <DialogTitle className={cn("text-xl flex items-center gap-2", isMobile && "text-lg")}>
              Edit Transaction
            </DialogTitle>
            <DialogDescription className={cn(isMobile && "text-xs")}>
              Make changes to your transaction
            </DialogDescription>
          </DialogHeader>

          <div className={cn("space-y-5 py-4", isMobile && "space-y-4 py-2")}>
            {/* Transaction Type Selector */}
            <div className="space-y-2">
              <Label className={cn("text-sm font-medium", isMobile && "text-xs")}>Transaction Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["income", "expense", "investment"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t)
                      setCategory("")
                      setCustomCategory("")
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg border-2 transition-all",
                      isMobile ? "p-2 gap-1" : "p-3",
                      type === t
                        ? getTypeColor(t) + " border-current font-medium"
                        : "border-muted hover:border-muted-foreground/50"
                    )}
                  >
                    {getTypeIcon(t)}
                    <span className={cn("capitalize", isMobile ? "text-xs" : "text-sm")}>{t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="edit-amount" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <IndianRupee className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                Amount
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={cn("pl-8 font-semibold", isMobile ? "text-base" : "text-lg")}
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="edit-category" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <Tag className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="edit-category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions[type].map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">+ Custom Category</SelectItem>
                </SelectContent>
              </Select>
              {category === "custom" && (
                <Input
                  placeholder="Enter custom category..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="mt-2"
                  required
                />
              )}
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <Wallet className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                Payment Method
              </Label>
              <div className={cn("grid gap-2", isMobile ? "grid-cols-3" : "grid-cols-4")}>
                {paymentMethods.map((method) => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 rounded-lg border transition-all",
                        isMobile ? "p-1.5 text-[10px]" : "p-2 text-xs",
                        paymentMethod === method.value
                          ? "border-primary bg-primary/10 text-primary font-medium"
                          : "border-muted hover:border-muted-foreground/50"
                      )}
                    >
                      <Icon className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                      <span>{method.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-date" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <Calendar className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                Date
              </Label>
              <Input
                id="edit-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                <FileText className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                Description
                <span className={cn("text-muted-foreground font-normal", isMobile ? "text-[10px]" : "text-xs")}>(Optional)</span>
              </Label>
              <Textarea
                id="edit-description"
                placeholder="Add notes about this transaction..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={isMobile ? 1 : 2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} size={isMobile ? "sm" : "default"}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !amount || (!category || (category === "custom" && !customCategory))}
              size={isMobile ? "sm" : "default"}
              className={cn(
                "gap-2",
                type === "income"
                  ? "bg-green-600 hover:bg-green-700"
                  : type === "expense"
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-purple-600 hover:bg-purple-700"
              )}
            >
              {getTypeIcon(type)}
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
