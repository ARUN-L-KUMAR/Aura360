"use client"

import { useState, useEffect } from "react"
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
import { 
  IndianRupee, 
  Calendar, 
  Tag, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Share2,
  Smartphone,
  Wallet,
  CreditCard,
  Banknote,
  Building2,
} from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

// Payment method options
const paymentMethods = [
  { value: "upi", label: "UPI / GPay", icon: Smartphone },
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "debit_card", label: "Debit Card", icon: CreditCard },
  { value: "bank_transfer", label: "Bank Transfer", icon: Building2 },
  { value: "wallet", label: "Wallet", icon: Wallet },
]

// Category options for expenses
const categoryOptions = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Entertainment",
  "Health",
  "Education",
  "Rent",
  "Groceries",
  "Other",
]

interface ShareTransactionData {
  amount: number | null
  date: string
  description: string
  category: string
  payment_method: string
  raw_text?: string
}

interface ShareTransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: ShareTransactionData
  onSuccess?: () => void
}

export function ShareTransactionModal({
  open,
  onOpenChange,
  initialData,
  onSuccess,
}: ShareTransactionModalProps) {
  const isMobile = useIsMobile()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("Other")
  const [paymentMethod, setPaymentMethod] = useState("upi")

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      setAmount(initialData.amount?.toString() || "")
      setDate(initialData.date || new Date().toISOString().split("T")[0])
      setDescription(initialData.description || "")
      setCategory(initialData.category || "Other")
      setPaymentMethod(initialData.payment_method || "upi")
    }
  }, [initialData])

  // Reset success state when modal opens
  useEffect(() => {
    if (open) {
      setIsSuccess(false)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/finance/share-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          date,
          description,
          category,
          payment_method: paymentMethod,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to add transaction")
      }

      setIsSuccess(true)
      toast.success("✅ Expense added successfully!")
      
      // Call onSuccess callback after a short delay
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 1500)

    } catch (error: any) {
      console.error("Error adding shared transaction:", error)
      toast.error(error.message || "Failed to add transaction")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "sm:max-w-[450px]",
        isMobile && "max-h-[90vh] overflow-y-auto"
      )}>
        {isSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Expense Added!</h3>
            <p className="text-sm text-muted-foreground text-center">
              ₹{parseFloat(amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })} added as {category}
            </p>
          </div>
        ) : (
          // Form state
          <>
            <DialogHeader className={cn("pb-4", isMobile && "pb-2")}>
              <DialogTitle className={cn("flex items-center gap-2", isMobile && "text-lg")}>
                <Share2 className={cn(isMobile ? "h-4 w-4" : "h-5 w-5", "text-blue-600")} />
                Add Shared Transaction
              </DialogTitle>
              <DialogDescription className={cn(isMobile && "text-xs")}>
                Confirm the details from your UPI/GPay payment
              </DialogDescription>
            </DialogHeader>

            <div className={cn("space-y-4 py-4", isMobile && "space-y-3 py-2")}>
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="share-amount" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                  <IndianRupee className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                  Amount
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input
                    id="share-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn("pl-8 font-semibold", isMobile ? "text-base" : "text-lg")}
                    autoFocus
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="share-category" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                  <Tag className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                  Category
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="share-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                  <Wallet className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                  Payment Method
                </Label>
                <div className={cn("grid gap-2", isMobile ? "grid-cols-3" : "grid-cols-3")}>
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
                        <span className="truncate">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="share-date" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                  <Calendar className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                  Date
                </Label>
                <Input
                  id="share-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="share-description" className={cn("font-medium flex items-center gap-2", isMobile ? "text-xs" : "text-sm")}>
                  <FileText className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground")} />
                  Description
                  <span className={cn("text-muted-foreground font-normal", isMobile ? "text-[10px]" : "text-xs")}>(Optional)</span>
                </Label>
                <Textarea
                  id="share-description"
                  placeholder="Payment details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={isMobile ? 2 : 2}
                  className="resize-none"
                />
              </div>

              {/* Raw text preview (if available) */}
              {initialData?.raw_text && (
                <div className="p-3 rounded-lg bg-muted/50 border">
                  <p className={cn("text-muted-foreground mb-1", isMobile ? "text-[10px]" : "text-xs")}>
                    Shared text:
                  </p>
                  <p className={cn("text-foreground", isMobile ? "text-xs" : "text-sm")}>
                    {initialData.raw_text.length > 100 
                      ? initialData.raw_text.substring(0, 100) + "..." 
                      : initialData.raw_text
                    }
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                size={isMobile ? "sm" : "default"}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || !amount}
                size={isMobile ? "sm" : "default"}
                className="gap-2 bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4", "animate-spin")} />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className={cn(isMobile ? "h-3.5 w-3.5" : "h-4 w-4")} />
                    Add Expense
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
