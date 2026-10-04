"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Target,
  PiggyBank,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Pencil,
  Trash2,
  TrendingDown,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  MoreVertical,
  Flame,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { EditBudgetDialog } from "./edit-budget-dialog"
import { AddGoalDialog } from "./add-goal-dialog"
import { ContributeGoalDialog } from "./contribute-goal-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { BudgetWithSpend, FinancialGoal, Transaction } from "@/lib/types/finance"

interface BudgetsGoalsTabProps {
  transactions?: Transaction[]
}

export function BudgetsGoalsTab({ transactions = [] }: BudgetsGoalsTabProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // State
  const [activeSubTab, setActiveSubTab] = useState<"budgets" | "goals">("budgets")
  const [budgetsList, setBudgetsList] = useState<BudgetWithSpend[]>([])
  const [budgetSummary, setBudgetSummary] = useState<any>(null)
  const [goalsList, setGoalsList] = useState<FinancialGoal[]>([])
  const [goalSummary, setGoalSummary] = useState<any>(null)

  const [isLoadingBudgets, setIsLoadingBudgets] = useState(true)
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)

  // Current month YYYY-MM
  const now = new Date()
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey)

  // Dialog states
  const [showBudgetDialog, setShowBudgetDialog] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithSpend | null>(null)

  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)

  const [showContributeDialog, setShowContributeDialog] = useState(false)
  const [contributeGoal, setContributeGoal] = useState<FinancialGoal | null>(null)

  // Days left in selected month
  const daysRemainingInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number)
    const lastDay = new Date(year, month, 0).getDate()
    const isCurrentMonth = selectedMonth === currentMonthKey
    if (isCurrentMonth) {
      return Math.max(1, lastDay - now.getDate())
    }
    return 0
  }, [selectedMonth, currentMonthKey])

  // Extract available unique months from transactions or current month
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    set.add(currentMonthKey)
    transactions.forEach((t) => {
      const d = new Date(t.date)
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
    })
    return Array.from(set).sort().reverse()
  }, [transactions, currentMonthKey])

  // Extract category names from transactions for auto-suggestions
  const transactionCategories = useMemo(() => {
    const set = new Set<string>()
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => set.add(t.category))
    return Array.from(set).sort()
  }, [transactions])

  // Fetch Budgets
  const fetchBudgets = async () => {
    try {
      setIsLoadingBudgets(true)
      const res = await fetch(`/api/finance/budgets?month=${selectedMonth}`)
      const data = await res.json()
      if (res.ok && data.success) {
        setBudgetsList(data.data || [])
        setBudgetSummary(data.summary || null)
      }
    } catch (err) {
      console.error("Failed to load budgets:", err)
    } finally {
      setIsLoadingBudgets(false)
    }
  }

  // Fetch Goals
  const fetchGoals = async () => {
    try {
      setIsLoadingGoals(true)
      const res = await fetch("/api/finance/goals")
      const data = await res.json()
      if (res.ok && data.success) {
        setGoalsList(data.data || [])
        setGoalSummary(data.summary || null)
      }
    } catch (err) {
      console.error("Failed to load goals:", err)
    } finally {
      setIsLoadingGoals(false)
    }
  }

  useEffect(() => {
    fetchBudgets()
  }, [selectedMonth])

  useEffect(() => {
    fetchGoals()
  }, [])

  // Delete budget
  const handleDeleteBudget = async (id: string, category: string) => {
    if (!confirm(`Are you sure you want to remove the budget for "${category}"?`)) return

    try {
      const res = await fetch(`/api/finance/budgets?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete budget")
      }
      toast({
        title: "Budget Removed",
        description: `Budget for "${category}" was deleted.`,
      })
      fetchBudgets()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete budget",
        variant: "destructive",
      })
    }
  }

  // Delete goal
  const handleDeleteGoal = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the goal "${title}"?`)) return

    try {
      const res = await fetch(`/api/finance/goals?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete goal")
      }
      toast({
        title: "Goal Deleted",
        description: `Goal "${title}" was removed.`,
      })
      fetchGoals()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to delete goal",
        variant: "destructive",
      })
    }
  }

  // Safe daily spend velocity
  const safeDailySpend = useMemo(() => {
    if (!budgetSummary || daysRemainingInMonth <= 0) return 0
    const remaining = budgetSummary.remaining || 0
    return Math.max(0, Math.round(remaining / daysRemainingInMonth))
  }, [budgetSummary, daysRemainingInMonth])

  const overallBudget = budgetsList.find((b) => b.category === "__OVERALL__")
  const categoryBudgets = budgetsList.filter((b) => b.category !== "__OVERALL__")

  return (
    <div className="space-y-6">
      {/* Top Header Summary KPIs */}
      <div
        className={cn(
          "grid gap-3",
          isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-4 gap-4"
        )}
      >
        {/* Total Budget Allocation */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Total Budgeted
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Target className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{(budgetSummary?.overallCap || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {budgetsList.length} active spending {budgetsList.length === 1 ? "cap" : "caps"}
            </p>
          </CardContent>
        </Card>

        {/* Budget Consumed / Remaining */}
        <Card
          className={cn(
            "backdrop-blur-sm bg-card/80 border-l-4",
            budgetSummary?.isOverBudget
              ? "border-l-red-500"
              : (budgetSummary?.percentage || 0) >= 80
              ? "border-l-amber-500"
              : "border-l-green-500"
          )}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Budget Consumed
            </CardTitle>
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                budgetSummary?.isOverBudget
                  ? "bg-red-50 dark:bg-red-950/50 text-red-600"
                  : (budgetSummary?.percentage || 0) >= 80
                  ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600"
                  : "bg-green-50 dark:bg-green-950/50 text-green-600"
              )}
            >
              <TrendingDown className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div
                className={cn(
                  "text-2xl font-bold",
                  budgetSummary?.isOverBudget
                    ? "text-red-600"
                    : (budgetSummary?.percentage || 0) >= 80
                    ? "text-amber-600"
                    : "text-green-600"
                )}
              >
                {budgetSummary?.percentage || 0}%
              </div>
              <span className="text-xs text-muted-foreground">
                ₹{(budgetSummary?.remaining || 0).toLocaleString("en-IN")} safe left
              </span>
            </div>
            <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  budgetSummary?.isOverBudget
                    ? "bg-red-600"
                    : (budgetSummary?.percentage || 0) >= 80
                    ? "bg-amber-500"
                    : "bg-green-500"
                )}
                style={{ width: `${Math.min(100, budgetSummary?.percentage || 0)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Safe Daily Pace */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Daily Safe Spend
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ₹{safeDailySpend.toLocaleString("en-IN")}/day
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysRemainingInMonth > 0
                ? `${daysRemainingInMonth} days left this month`
                : "Month concluded"}
            </p>
          </CardContent>
        </Card>

        {/* Savings Goals Saved */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Goals Saved
            </CardTitle>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <PiggyBank className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(goalSummary?.totalSaved || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {goalSummary?.inProgressCount || 0} active, {goalSummary?.completedCount || 0} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Sub-Tabs and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        {/* Toggle between Budgets & Goals */}
        <div className="flex items-center gap-1 p-1 bg-secondary rounded-lg border">
          <button
            type="button"
            onClick={() => setActiveSubTab("budgets")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md font-bold uppercase tracking-widest text-xs transition-all",
              activeSubTab === "budgets"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Target className="w-3.5 h-3.5" />
            Category Budgets ({budgetsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("goals")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md font-bold uppercase tracking-widest text-xs transition-all",
              activeSubTab === "goals"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PiggyBank className="w-3.5 h-3.5" />
            Savings Goals ({goalsList.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeSubTab === "budgets" && (
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[140px] h-9 text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((m) => (
                    <SelectItem key={m} value={m} className="text-xs">
                      {new Date(m + "-01").toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                size="sm"
                onClick={() => {
                  setEditingBudget(null)
                  setShowBudgetDialog(true)
                }}
                className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9"
              >
                <Plus className="w-3.5 h-3.5" />
                Set Budget
              </Button>
            </>
          )}

          {activeSubTab === "goals" && (
            <Button
              size="sm"
              onClick={() => {
                setEditingGoal(null)
                setShowGoalDialog(true)
              }}
              className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              New Goal
            </Button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: CATEGORY BUDGETS */}
      {activeSubTab === "budgets" && (
        <div className="space-y-4">
          {/* Overall Month Cap Card (if set) */}
          {overallBudget && (
            <Card className="backdrop-blur-sm bg-gradient-to-r from-blue-500/10 via-primary/5 to-transparent border-blue-500/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest">
                        Master Limit
                      </span>
                      <h3 className="text-lg font-bold">Overall Monthly Spend Cap</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Covers all transactions across all categories for this month.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBudget(overallBudget)
                        setShowBudgetDialog(true)
                      }}
                      className="h-8 text-xs font-semibold"
                    >
                      <Pencil className="w-3 h-3 mr-1" /> Edit Cap
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBudget(overallBudget.id, "Overall Cap")}
                      className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-muted-foreground">
                      Spent ₹{overallBudget.spent.toLocaleString("en-IN")} of ₹
                      {overallBudget.amount.toLocaleString("en-IN")}
                    </span>
                    <span
                      className={cn(
                        "font-bold",
                        overallBudget.isOverBudget
                          ? "text-red-600"
                          : overallBudget.isNearLimit
                          ? "text-amber-600"
                          : "text-green-600"
                      )}
                    >
                      {overallBudget.percentage}% used
                    </span>
                  </div>
                  <div className="w-full bg-secondary h-3 rounded-full overflow-hidden border">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        overallBudget.isOverBudget
                          ? "bg-red-600"
                          : overallBudget.isNearLimit
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      )}
                      style={{ width: `${Math.min(100, overallBudget.percentage)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Category Budgets Grid */}
          {isLoadingBudgets ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs uppercase tracking-widest font-bold">Loading budgets...</p>
            </div>
          ) : categoryBudgets.length === 0 && !overallBudget ? (
            <Card className="border-dashed p-10 text-center backdrop-blur-sm bg-card/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">No Budgets Set for This Month</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Take control of your cashflow by setting spending targets on categories like Food, Shopping, or Utilities.
              </p>
              <Button
                onClick={() => {
                  setEditingBudget(null)
                  setShowBudgetDialog(true)
                }}
                className="gap-2 font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                Set Your First Budget
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryBudgets.map((b) => (
                <Card
                  key={b.id}
                  className={cn(
                    "backdrop-blur-sm bg-card/80 transition-shadow hover:shadow-md border",
                    b.isOverBudget
                      ? "border-red-500/50"
                      : b.isNearLimit
                      ? "border-amber-500/50"
                      : "border-border"
                  )}
                >
                  <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        {b.category}
                        {b.isOverBudget && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-950 text-red-600 font-bold uppercase tracking-wider flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Over
                          </span>
                        )}
                        {b.isNearLimit && !b.isOverBudget && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-600 font-bold uppercase tracking-wider flex items-center gap-1">
                            <Flame className="w-3 h-3" /> &gt;{b.alertThreshold}%
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-[11px] text-muted-foreground">
                        Limit: ₹{parseFloat(b.amount.toString()).toLocaleString("en-IN")}
                      </p>
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
                            setEditingBudget(b)
                            setShowBudgetDialog(true)
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Limit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteBudget(b.id, b.category)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-semibold text-muted-foreground">
                        Spent: ₹{b.spent.toLocaleString("en-IN")}
                      </span>
                      <span
                        className={cn(
                          "font-bold",
                          b.isOverBudget
                            ? "text-red-600"
                            : b.isNearLimit
                            ? "text-amber-600"
                            : "text-green-600"
                        )}
                      >
                        {b.percentage}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden border">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          b.isOverBudget
                            ? "bg-red-600"
                            : b.isNearLimit
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        )}
                        style={{ width: `${Math.min(100, b.percentage)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                      <span>Remaining</span>
                      <span className="font-bold text-foreground">
                        {b.isOverBudget
                          ? `₹${(b.spent - parseFloat(b.amount.toString())).toLocaleString("en-IN")} over`
                          : `₹${b.remaining.toLocaleString("en-IN")}`}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: SAVINGS GOALS & SINKING FUNDS */}
      {activeSubTab === "goals" && (
        <div className="space-y-4">
          {isLoadingGoals ? (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs uppercase tracking-widest font-bold">Loading goals...</p>
            </div>
          ) : goalsList.length === 0 ? (
            <Card className="border-dashed p-10 text-center backdrop-blur-sm bg-card/50">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <PiggyBank className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1">No Savings Goals Configured</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Create dedicated sinking funds for your Emergency Fund, new gadgets, travel, or debt payoffs.
              </p>
              <Button
                onClick={() => {
                  setEditingGoal(null)
                  setShowGoalDialog(true)
                }}
                className="gap-2 font-bold text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" />
                Create First Goal
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goalsList.map((g: any) => {
                const isComplete = g.isCompleted || g.percentage >= 100
                return (
                  <Card
                    key={g.id}
                    className={cn(
                      "backdrop-blur-sm bg-card/80 transition-shadow hover:shadow-md border overflow-hidden",
                      isComplete ? "border-emerald-500/50" : "border-border"
                    )}
                  >
                    {/* Top Accent Strip */}
                    <div
                      className="h-1.5 w-full"
                      style={{ backgroundColor: g.color || "#3b82f6" }}
                    />

                    <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: g.color || "#3b82f6" }}
                          />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {g.category || "Savings"}
                          </span>
                        </div>
                        <CardTitle className="text-base font-bold">{g.title}</CardTitle>
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
                              setContributeGoal(g)
                              setShowContributeDialog(true)
                            }}
                          >
                            <ArrowUpRight className="w-3.5 h-3.5 mr-2" /> Add Funds
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingGoal(g)
                              setShowGoalDialog(true)
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Goal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteGoal(g.id, g.title)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 space-y-3">
                      {/* Amounts */}
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-xl font-bold text-foreground">
                            ₹{parseFloat(g.currentAmount.toString()).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs text-muted-foreground ml-1.5">
                            / ₹{parseFloat(g.targetAmount.toString()).toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "text-xs font-bold",
                            isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}
                        >
                          {g.percentage}%
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden border">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(100, g.percentage)}%`,
                            backgroundColor: isComplete ? "#10b981" : g.color || "#3b82f6",
                          }}
                        />
                      </div>

                      {/* Timeline / Days remaining badge */}
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {g.targetDate ? (
                            <span>
                              {g.daysRemaining !== null && g.daysRemaining >= 0
                                ? `${g.daysRemaining} days left`
                                : "Deadline reached"}
                            </span>
                          ) : (
                            <span>Ongoing</span>
                          )}
                        </div>

                        {isComplete ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setContributeGoal(g)
                              setShowContributeDialog(true)
                            }}
                            className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider"
                          >
                            + Deposit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <EditBudgetDialog
        open={showBudgetDialog}
        onOpenChange={setShowBudgetDialog}
        existingBudget={editingBudget}
        existingCategories={transactionCategories}
        currentMonth={selectedMonth}
        onSaved={fetchBudgets}
      />

      <AddGoalDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        existingGoal={editingGoal}
        onSaved={fetchGoals}
      />

      <ContributeGoalDialog
        open={showContributeDialog}
        onOpenChange={setShowContributeDialog}
        goal={contributeGoal}
        onSaved={fetchGoals}
      />
    </div>
  )
}
