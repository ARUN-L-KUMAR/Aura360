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
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, Loader2, Sparkles, RefreshCw } from "lucide-react"
import type { Subscription, BillingCycle, SubscriptionStatus } from "@/lib/types/finance"

interface AddSubscriptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingSub?: Subscription | null
  initialValues?: {
    name?: string
    amount?: number
    billingCycle?: BillingCycle
    category?: string
    startDate?: string
  } | null
  onSaved: () => void
}

const POPULAR_PRESETS = [
  { name: "Netflix", amount: 649, cycle: "monthly", category: "Streaming" },
  { name: "Spotify", amount: 119, cycle: "monthly", category: "Music & Audio" },
  { name: "Amazon Prime", amount: 1499, cycle: "yearly", category: "Streaming & Shopping" },
  { name: "YouTube Premium", amount: 149, cycle: "monthly", category: "Streaming" },
  { name: "ChatGPT Plus", amount: 1999, cycle: "monthly", category: "AI & Software" },
  { name: "iCloud 200GB", amount: 219, cycle: "monthly", category: "Cloud & Storage" },
  { name: "Wifi Broadband", amount: 999, cycle: "monthly", category: "Utilities" },
  { name: "Gym Membership", amount: 2500, cycle: "monthly", category: "Fitness & Health" },
]

const SUBSCRIPTION_CATEGORIES = [
  "Streaming",
  "Music & Audio",
  "AI & Software",
  "Cloud & Storage",
  "Utilities",
  "Fitness & Health",
  "Rent & Housing",
  "Gaming",
  "News & Media",
  "Other",
]

export function AddSubscriptionDialog({
  open,
  onOpenChange,
  existingSub,
  initialValues,
  onSaved,
}: AddSubscriptionDialogProps) {
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [startDate, setStartDate] = useState("")
  const [nextBillingDate, setNextBillingDate] = useState("")
  const [category, setCategory] = useState("Streaming")
  const [paymentMethod, setPaymentMethod] = useState("upi")
  const [reminderDays, setReminderDays] = useState(7)
  const [autoRenew, setAutoRenew] = useState(true)
  const [status, setStatus] = useState<SubscriptionStatus>("active")
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-calculate next billing date
  const computeNextDate = (start: string, cycle: string): string => {
    if (!start) return ""
    const d = new Date(start)
    switch (cycle) {
      case "weekly":
        d.setDate(d.getDate() + 7)
        break
      case "monthly":
        d.setMonth(d.getMonth() + 1)
        break
      case "quarterly":
        d.setMonth(d.getMonth() + 3)
        break
      case "semi_annually":
        d.setMonth(d.getMonth() + 6)
        break
      case "yearly":
        d.setFullYear(d.getFullYear() + 1)
        break
      default:
        d.setMonth(d.getMonth() + 1)
    }
    return d.toISOString().split("T")[0]
  }

  useEffect(() => {
    if (existingSub) {
      setName(existingSub.name)
      setAmount(existingSub.amount.toString())
      setBillingCycle(existingSub.billingCycle || "monthly")
      setStartDate(
        existingSub.startDate
          ? new Date(existingSub.startDate).toISOString().split("T")[0]
          : ""
      )
      setNextBillingDate(
        existingSub.nextBillingDate
          ? new Date(existingSub.nextBillingDate).toISOString().split("T")[0]
          : ""
      )
      setCategory(existingSub.category || "Streaming")
      setPaymentMethod(existingSub.paymentMethod || "upi")
      setReminderDays(existingSub.reminderDays || 7)
      setAutoRenew(existingSub.autoRenew ?? true)
      setStatus(existingSub.status || "active")
      setDescription(existingSub.description || "")
    } else if (initialValues) {
      setName(initialValues.name || "")
      setAmount(initialValues.amount ? initialValues.amount.toString() : "")
      setBillingCycle(initialValues.billingCycle || "monthly")
      const today = initialValues.startDate || new Date().toISOString().split("T")[0]
      setStartDate(today)
      setNextBillingDate(computeNextDate(today, initialValues.billingCycle || "monthly"))
      setCategory(initialValues.category || "Streaming")
      setPaymentMethod("upi")
      setReminderDays(7)
      setAutoRenew(true)
      setStatus("active")
      setDescription("")
    } else {
      const today = new Date().toISOString().split("T")[0]
      setName("")
      setAmount("")
      setBillingCycle("monthly")
      setStartDate(today)
      setNextBillingDate(computeNextDate(today, "monthly"))
      setCategory("Streaming")
      setPaymentMethod("upi")
      setReminderDays(7)
      setAutoRenew(true)
      setStatus("active")
      setDescription("")
    }
  }, [existingSub, initialValues, open])

  const handlePresetClick = (preset: typeof POPULAR_PRESETS[0]) => {
    setName(preset.name)
    setAmount(preset.amount.toString())
    setBillingCycle(preset.cycle as BillingCycle)
    setCategory(preset.category)
    const today = startDate || new Date().toISOString().split("T")[0]
    setNextBillingDate(computeNextDate(today, preset.cycle))
  }

  const handleCycleChange = (newCycle: BillingCycle) => {
    setBillingCycle(newCycle)
    if (startDate) {
      setNextBillingDate(computeNextDate(startDate, newCycle))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the subscription service name.",
        variant: "destructive",
      })
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid recurring billing amount.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      const isEditing = Boolean(existingSub?.id)
      const url = "/api/finance/subscriptions"
      const method = isEditing ? "PUT" : "POST"

      const payload: any = {
        name: name.trim(),
        amount: numAmount,
        currency: "INR",
        billingCycle,
        startDate: startDate || new Date().toISOString().split("T")[0],
        nextBillingDate: nextBillingDate || computeNextDate(startDate, billingCycle),
        category,
        paymentMethod,
        reminderDays: Number(reminderDays) || 7,
        autoRenew,
        status,
        description: description.trim() || null,
      }

      if (isEditing) {
        payload.id = existingSub!.id
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save subscription")
      }

      toast({
        title: isEditing ? "Subscription Updated" : "Subscription Tracked",
        description: `${name} (₹${numAmount}/${billingCycle}) saved to your recurring bills tracker.`,
      })

      onSaved()
      onOpenChange(false)
    } catch (err: any) {
      console.error("Save subscription error:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to save subscription",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl">
              {existingSub ? "Edit Subscription" : "Add Recurring Bill"}
            </DialogTitle>
          </div>
          <DialogDescription>
            Track auto-debits, renewal countdowns, and upcoming bill reminders.
          </DialogDescription>
        </DialogHeader>

        {/* Quick 1-Click Popular Presets (only on new) */}
        {!existingSub && (
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Quick Presets
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
              {POPULAR_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className="text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-primary hover:text-primary-foreground border shrink-0 transition-colors font-medium"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Service Name */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Service / Bill Name
            </Label>
            <Input
              placeholder="e.g. Netflix, Wifi Broadband, Rent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Amount & Billing Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Recurring Amount (₹)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="649"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 font-bold"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Frequency
              </Label>
              <Select value={billingCycle} onValueChange={(val: any) => handleCycleChange(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly (3 mos)</SelectItem>
                  <SelectItem value="semi_annually">Semi-Annually (6 mos)</SelectItem>
                  <SelectItem value="yearly">Yearly (Annual)</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Next Billing Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Next Billing Date
              </Label>
              <Input
                type="date"
                value={nextBillingDate}
                onChange={(e) => setNextBillingDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {SUBSCRIPTION_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payment Method & Reminder Days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI AutoPay</SelectItem>
                  <SelectItem value="card">Credit / Debit Card</SelectItem>
                  <SelectItem value="bank_transfer">Net Banking / ECS</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Reminder Notice
              </Label>
              <Select
                value={reminderDays.toString()}
                onValueChange={(val) => setReminderDays(Number(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Reminder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days before</SelectItem>
                  <SelectItem value="7">7 days before</SelectItem>
                  <SelectItem value="14">14 days before</SelectItem>
                  <SelectItem value="1">1 day before</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Auto-renew switch */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border">
            <div className="space-y-0.5">
              <Label className="text-xs font-bold">Auto-Renewing</Label>
              <p className="text-[11px] text-muted-foreground">
                Automatically roll forward the next billing date upon renewal.
              </p>
            </div>
            <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
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
                  {existingSub ? "Update Subscription" : "Add Subscription"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
