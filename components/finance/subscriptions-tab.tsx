"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CreditCard,
  Plus,
  AlertCircle,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingDown,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Sparkles,
  Zap,
  Flame,
  ShieldCheck,
  Pause,
  Play,
  XCircle,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { AddSubscriptionDialog } from "./add-subscription-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type {
  SubscriptionWithMetrics,
  DetectedRecurringTransaction,
  BillingCycle,
} from "@/lib/types/finance"

export function SubscriptionsTab() {
  const isMobile = useIsMobile()
  const { toast } = useToast()

  const [subscriptionsList, setSubscriptionsList] = useState<SubscriptionWithMetrics[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [detectedRecurring, setDetectedRecurring] = useState<DetectedRecurringTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetected, setIsLoadingDetected] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "due_soon" | "inactive">("all")

  // Dialog state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingSub, setEditingSub] = useState<SubscriptionWithMetrics | null>(null)
  const [quickAddPreset, setQuickAddPreset] = useState<{
    name?: string
    amount?: number
    billingCycle?: BillingCycle
    category?: string
    startDate?: string
  } | null>(null)

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/finance/subscriptions")
      const data = await res.json()
      if (res.ok && data.success) {
        setSubscriptionsList(data.data || [])
        setSummary(data.summary || null)
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch detected recurring transactions
  const fetchDetected = async () => {
    try {
      setIsLoadingDetected(true)
      const res = await fetch("/api/finance/subscriptions/detect")
      const data = await res.json()
      if (res.ok && data.success) {
        setDetectedRecurring(data.data || [])
      }
    } catch (err) {
      console.error("Failed to detect recurring payments:", err)
    } finally {
      setIsLoadingDetected(false)
    }
  }

  useEffect(() => {
    fetchSubscriptions()
    fetchDetected()
  }, [])

  // Mark subscription renewed (advances billing date)
  const handleMarkRenewed = async (id: string, name: string) => {
    try {
      const res = await fetch("/api/finance/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, markRenewed: true }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to renew subscription")
      }
      toast({
        title: "Subscription Renewed",
        description: `${name} next billing date rolled forward.`,
      })
      fetchSubscriptions()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to renew subscription",
        variant: "destructive",
      })
    }
  }

  // Toggle pause/active status
  const handleToggleStatus = async (sub: SubscriptionWithMetrics) => {
    const newStatus = sub.status === "active" ? "pending" : "active"
    try {
      const res = await fetch("/api/finance/subscriptions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sub.id, status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update status")
      }
      toast({
        title: newStatus === "active" ? "Subscription Resumed" : "Subscription Paused",
        description: `${sub.name} is now ${newStatus === "active" ? "active" : "paused"}.`,
      })
      fetchSubscriptions()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update status",
        variant: "destructive",
      })
    }
  }

  // Delete subscription
  const handleDeleteSub = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to stop tracking "${name}"?`)) return
    try {
      const res = await fetch(`/api/finance/subscriptions?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete subscription")
      }
      toast({
        title: "Subscription Removed",
        description: `${name} was removed from your tracker.`,
      })
      fetchSubscriptions()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete subscription",
        variant: "destructive",
      })
    }
  }

  // Filter list
  const filteredList = useMemo(() => {
    if (statusFilter === "active") {
      return subscriptionsList.filter((s) => s.status === "active")
    }
    if (statusFilter === "due_soon") {
      return subscriptionsList.filter(
        (s) => s.status === "active" && (s.isDueSoon || s.isOverdue)
      )
    }
    if (statusFilter === "inactive") {
      return subscriptionsList.filter((s) => s.status !== "active")
    }
    return subscriptionsList
  }, [subscriptionsList, statusFilter])

  return (
    <div className="space-y-6">
      {/* Top Header Summary KPIs */}
      <div
        className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4 gap-4"
        )}
      >
        {/* Monthly Burn Rate */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Monthly Burn Rate
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <RefreshCw className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(summary?.monthlyBurnRate || 0).toLocaleString("en-IN")}/mo
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Recurring monthly commitment
            </p>
          </CardContent>
        </Card>

        {/* Annual Commitment */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Annual Commitment
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Calendar className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₹{(summary?.yearlyBurnRate || 0).toLocaleString("en-IN")}/yr
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total projected annual spend
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Renewals in Next 7 Days */}
        <Card
          className={cn(
            "backdrop-blur-sm bg-card/80 border-l-4",
            (summary?.dueIn7DaysCount || 0) > 0 || (summary?.overdueCount || 0) > 0
              ? "border-l-amber-500"
              : "border-l-green-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Due in Next 7 Days
            </CardTitle>
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                (summary?.dueIn7DaysCount || 0) > 0 || (summary?.overdueCount || 0) > 0
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600"
                  : "bg-green-50 dark:bg-green-950/50 text-green-600"
              )}
            >
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "text-2xl font-bold",
                (summary?.dueIn7DaysCount || 0) > 0 || (summary?.overdueCount || 0) > 0
                  ? "text-amber-600"
                  : "text-green-600"
              )}
            >
              {summary?.dueIn7DaysCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(summary?.overdueCount || 0) > 0
                ? `⚠️ ${summary?.overdueCount} bills overdue`
                : "No overdue payments"}
            </p>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Services
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary?.activeCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.totalSubscriptions || 0} total subscriptions logged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SMART RECURRING DETECTOR BANNER (from historical transactions) */}
      {detectedRecurring.length > 0 && (
        <Card className="backdrop-blur-sm bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent border-blue-500/30">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-sm">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    Recurring Charges Detected in Transactions
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    We spotted repeating expenses in your ledger. Add them to your tracker with 1 click:
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {detectedRecurring.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background border shadow-xs shrink-0 text-xs"
                >
                  <div>
                    <span className="font-bold">{item.name}</span>
                    <span className="text-muted-foreground ml-1.5">
                      (₹{item.amount.toLocaleString("en-IN")}/{item.estimatedCycle})
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingSub(null)
                      setQuickAddPreset({
                        name: item.name,
                        amount: item.amount,
                        billingCycle: item.estimatedCycle,
                        category: item.category,
                        startDate: item.lastDate,
                      })
                      setShowAddDialog(true)
                    }}
                    className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground"
                  >
                    + Track
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Control Bar: Filters & Add Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        {/* Status Filter Chips */}
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border">
          {[
            { id: "all", label: `All (${subscriptionsList.length})` },
            { id: "active", label: `Active (${summary?.activeCount || 0})` },
            { id: "due_soon", label: `Due Soon (${(summary?.dueIn7DaysCount || 0) + (summary?.overdueCount || 0)})` },
            { id: "inactive", label: `Inactive (${(summary?.pausedCount || 0) + (summary?.cancelledCount || 0)})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id as any)}
              className={cn(
                "px-3 py-1.5 rounded-md font-bold uppercase tracking-widest text-[11px] transition-all",
                statusFilter === f.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Add Subscription Button */}
        <Button
          size="sm"
          onClick={() => {
            setEditingSub(null)
            setQuickAddPreset(null)
            setShowAddDialog(true)
          }}
          className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Subscription
        </Button>
      </div>

      {/* Subscriptions Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs uppercase tracking-widest font-bold">Loading subscriptions...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <Card className="border-dashed p-10 text-center backdrop-blur-sm bg-card/50">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold mb-1">No Subscriptions Found</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Track recurring bills like Netflix, Spotify, gym memberships, and rent to never get surprised by auto-debits.
          </p>
          <Button
            onClick={() => {
              setEditingSub(null)
              setQuickAddPreset(null)
              setShowAddDialog(true)
            }}
            className="gap-2 font-bold text-xs uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            Track Your First Subscription
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredList.map((sub) => {
            const isDueSoon = sub.isDueSoon
            const isOverdue = sub.isOverdue
            const isPaused = sub.status === "pending"
            const isCancelled = sub.status === "cancelled" || sub.status === "expired"

            return (
              <Card
                key={sub.id}
                className={cn(
                  "backdrop-blur-sm bg-card/80 transition-shadow hover:shadow-md border",
                  isOverdue
                    ? "border-red-500/60"
                    : isDueSoon
                    ? "border-amber-500/60"
                    : "border-border"
                )}
              >
                <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-secondary border">
                        {sub.category || "Subscriptions"}
                      </span>
                      {isPaused && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          Paused
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600">
                          Cancelled
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      {sub.name}
                    </CardTitle>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingSub(sub)
                          setQuickAddPreset(null)
                          setShowAddDialog(true)
                        }}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(sub)}>
                        {sub.status === "active" ? (
                          <>
                            <Pause className="w-3.5 h-3.5 mr-2" /> Pause Service
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 mr-2" /> Resume Service
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteSub(sub.id, sub.name)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="px-4 pb-4 space-y-3">
                  {/* Amount & Frequency */}
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold">
                        ₹{sub.amount.toLocaleString("en-IN")}
                      </span>
                      <span className="text-xs text-muted-foreground ml-1 font-semibold uppercase">
                        /{sub.billingCycle}
                      </span>
                    </div>

                    {sub.billingCycle !== "monthly" && (
                      <span className="text-xs text-muted-foreground">
                        (₹{sub.monthlyEquivalent.toLocaleString("en-IN")}/mo)
                      </span>
                    )}
                  </div>

                  {/* Renewal Date & Countdown Alert */}
                  <div
                    className={cn(
                      "flex items-center justify-between p-2.5 rounded-lg border text-xs",
                      isOverdue
                        ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400"
                        : isDueSoon
                        ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400"
                        : "bg-secondary/50 border-border text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {sub.nextBillingDate
                          ? new Date(sub.nextBillingDate).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "No date"}
                      </span>
                    </div>

                    <span className="font-bold">
                      {isOverdue
                        ? `Overdue by ${Math.abs(sub.daysUntilRenewal || 0)}d`
                        : sub.daysUntilRenewal === 0
                        ? "Due Today!"
                        : sub.daysUntilRenewal === 1
                        ? "Due Tomorrow"
                        : sub.daysUntilRenewal !== null
                        ? `In ${sub.daysUntilRenewal} days`
                        : ""}
                    </span>
                  </div>

                  {/* Payment Method & Quick Renew Action */}
                  <div className="flex items-center justify-between pt-1 border-t text-xs">
                    <span className="text-muted-foreground capitalize">
                      {sub.paymentMethod ? `${sub.paymentMethod.replace("_", " ")} AutoPay` : "Manual"}
                    </span>

                    {sub.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkRenewed(sub.id, sub.name)}
                        className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Mark Renewed
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* ADD / EDIT SUBSCRIPTION DIALOG */}
      <AddSubscriptionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        existingSub={editingSub}
        initialValues={quickAddPreset}
        onSaved={fetchSubscriptions}
      />
    </div>
  )
}
