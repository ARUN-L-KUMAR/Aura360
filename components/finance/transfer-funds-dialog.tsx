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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeftRight, Loader2, Sparkles, Building2, Banknote, Smartphone, CreditCard } from "lucide-react"

interface TransferFundsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

const PAYMENT_ACCOUNTS = [
  { id: "bank_transfer", label: "Bank Account", icon: Building2 },
  { id: "upi", label: "UPI AutoPay / App", icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", icon: CreditCard },
  { id: "cash", label: "Cash in Hand", icon: Banknote },
]

export function TransferFundsDialog({
  open,
  onOpenChange,
  onSaved,
}: TransferFundsDialogProps) {
  const { toast } = useToast()
  const [fromMethod, setFromMethod] = useState("bank_transfer")
  const [toMethod, setToMethod] = useState("cash")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSwap = () => {
    const temp = fromMethod
    setFromMethod(toMethod)
    setToMethod(temp)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (fromMethod === toMethod) {
      toast({
        title: "Same Account Selected",
        description: "Source and destination accounts must be different.",
        variant: "destructive",
      })
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid transfer amount.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/finance/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromMethod,
          toMethod,
          amount: numAmount,
          date,
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record transfer")
      }

      toast({
        title: "Transfer Recorded",
        description: `Transferred ₹${numAmount.toLocaleString("en-IN")} from ${fromMethod} to ${toMethod}.`,
      })

      setAmount("")
      setDescription("")
      setNotes("")
      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Transfer error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to process transfer",
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
            <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">Transfer Funds</DialogTitle>
          </div>
          <DialogDescription>
            Move money between your Bank, UPI, or Cash in Hand without skewing net income or expenses.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* From / To Accounts with Swap Button */}
          <div className="p-3 rounded-lg bg-secondary/50 border space-y-3 relative">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                From Account (Debit)
              </Label>
              <Select value={fromMethod} onValueChange={setFromMethod}>
                <SelectTrigger className="h-9 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_ACCOUNTS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center -my-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="h-7 w-7 rounded-full bg-background shadow-xs hover:bg-secondary z-10"
                title="Swap Accounts"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 rotate-90" />
              </Button>
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                To Account (Credit)
              </Label>
              <Select value={toMethod} onValueChange={setToMethod}>
                <SelectTrigger className="h-9 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_ACCOUNTS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Amount (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-base font-bold"
                  autoFocus
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Transfer Date
              </Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description (Optional)
            </Label>
            <Input
              placeholder="e.g. ATM Cash Withdrawal, Bank to UPI"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
                  Recording...
                </>
              ) : (
                <>
                  <ArrowLeftRight className="w-4 h-4" />
                  Record Transfer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
