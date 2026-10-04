"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  Award,
  ArrowUp,
  ArrowDown,
  Minus,
  Hash,
  Calendar,
  Trophy,
  Flame,
  Filter,
  X,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  ArrowRight,
  DollarSign,
  Layers,
  Activity,
  Clock,
  ShieldCheck,
  CreditCard,
  Building2,
  Banknote,
  Smartphone,
  Info,
} from "lucide-react"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import type { Transaction, BalanceData } from "@/lib/types/finance"

interface ReportsTabProps {
  transactions: Transaction[]
  balanceData?: BalanceData | null
}

const CATEGORY_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#6366f1",
  "#84cc16", "#a855f7", "#eab308", "#0ea5e9", "#d946ef",
]

const METHOD_COLORS: Record<string, string> = {
  upi: "#8b5cf6",
  bank_transfer: "#3b82f6",
  card: "#f59e0b",
  credit_card: "#f59e0b",
  debit_card: "#06b6d4",
  cash: "#10b981",
  wallet: "#ec4899",
  other: "#64748b",
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

type DatePreset = "30D" | "3M" | "6M" | "1Y" | "YTD" | "ALL" | "CUSTOM"
type Granularity = "monthly" | "weekly" | "daily"
type ChartMode = "bar" | "area" | "cumulative"

export function ReportsTab({ transactions, balanceData }: ReportsTabProps) {
  const isMobile = useIsMobile()
  const { toast } = useToast()

  // ─── Filter State ────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>("6M")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [granularity, setGranularity] = useState<Granularity>("monthly")
  const [selectedCategory, setSelectedCategory] = useState("ALL")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("ALL")
  const [selectedType, setSelectedType] = useState<"ALL" | "expense" | "income" | "investment">("ALL")
  const [chartMode, setChartMode] = useState<ChartMode>("bar")
  const [activeSubTab, setActiveSubTab] = useState("trends")

  // ─── AI Diagnostics State ────────────────────────────────────────────────
  const [aiInsights, setAiInsights] = useState<any[] | null>(null)
  const [isLoadingAi, setIsLoadingAi] = useState(false)

  // ─── Unique Lists for Dropdowns ──────────────────────────────────────────
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) cats.add(t.category)
    })
    return Array.from(cats).sort()
  }, [transactions])

  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>()
    transactions.forEach((t) => {
      if (t.paymentMethod) methods.add(t.paymentMethod)
    })
    return Array.from(methods).sort()
  }, [transactions])

  // ─── Filter Bounds Calculation ───────────────────────────────────────────
  const { startDate, endDate, previousStartDate, previousEndDate } = useMemo(() => {
    const now = new Date()
    let start: Date | null = null
    let end: Date = new Date(now)

    if (datePreset === "30D") {
      start = new Date(now)
      start.setDate(now.getDate() - 30)
    } else if (datePreset === "3M") {
      start = new Date(now)
      start.setMonth(now.getMonth() - 3)
    } else if (datePreset === "6M") {
      start = new Date(now)
      start.setMonth(now.getMonth() - 6)
    } else if (datePreset === "1Y") {
      start = new Date(now)
      start.setFullYear(now.getFullYear() - 1)
    } else if (datePreset === "YTD") {
      start = new Date(now.getFullYear(), 0, 1)
    } else if (datePreset === "CUSTOM") {
      if (customStartDate) start = new Date(customStartDate)
      if (customEndDate) end = new Date(customEndDate)
    }

    // Previous comparison period of equal length
    let prevStart: Date | null = null
    let prevEnd: Date | null = null
    if (start) {
      const durationMs = end.getTime() - start.getTime()
      prevEnd = new Date(start.getTime() - 1)
      prevStart = new Date(prevEnd.getTime() - durationMs)
    }

    return {
      startDate: start,
      endDate: end,
      previousStartDate: prevStart,
      previousEndDate: prevEnd,
    }
  }, [datePreset, customStartDate, customEndDate])

  // ─── Filtered Transactions ───────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const tDate = new Date(t.date)
      if (startDate && tDate < startDate) return false
      if (endDate && tDate > endDate) return false
      if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false
      if (selectedPaymentMethod !== "ALL" && t.paymentMethod !== selectedPaymentMethod) return false
      if (selectedType !== "ALL" && t.type !== selectedType) return false
      return true
    })
  }, [transactions, startDate, endDate, selectedCategory, selectedPaymentMethod, selectedType])

  // ─── Prior Period Transactions (for deltas) ──────────────────────────────
  const priorPeriodTransactions = useMemo(() => {
    if (!previousStartDate || !previousEndDate) return []
    return transactions.filter((t) => {
      const tDate = new Date(t.date)
      if (tDate < previousStartDate || tDate > previousEndDate) return false
      if (selectedCategory !== "ALL" && t.category !== selectedCategory) return false
      if (selectedPaymentMethod !== "ALL" && t.paymentMethod !== selectedPaymentMethod) return false
      if (selectedType !== "ALL" && t.type !== selectedType) return false
      return true
    })
  }, [transactions, previousStartDate, previousEndDate, selectedCategory, selectedPaymentMethod, selectedType])

  // ─── Executive KPI Calculations ──────────────────────────────────────────
  const kpis = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const investment = filteredTransactions
      .filter((t) => t.type === "investment")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const netSavings = income - expense
    const savingsRate = income > 0 ? (netSavings / income) * 100 : 0

    // Prior period
    const priorIncome = priorPeriodTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const priorExpense = priorPeriodTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const incomeDelta = priorIncome > 0 ? ((income - priorIncome) / priorIncome) * 100 : 0
    const expenseDelta = priorExpense > 0 ? ((expense - priorExpense) / priorExpense) * 100 : 0

    // Days in current filtered range
    let days = 30
    if (startDate && endDate) {
      days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
    }
    const dailyBurnRate = expense / days
    const realBalance = balanceData?.realBalance ?? 0
    const runwayDays = dailyBurnRate > 0 ? Math.floor(realBalance / dailyBurnRate) : 999

    // Financial Health Score (0 - 100)
    let score = 50
    // 1. Savings rate component (up to +30)
    if (savingsRate >= 30) score += 30
    else if (savingsRate >= 20) score += 20
    else if (savingsRate >= 10) score += 10
    else if (savingsRate < 0) score -= 20

    // 2. Expense delta control component (up to +15)
    if (expenseDelta <= 0) score += 15
    else if (expenseDelta <= 10) score += 5
    else score -= 10

    // 3. Runway emergency buffer (up to +15)
    if (runwayDays >= 90) score += 15
    else if (runwayDays >= 45) score += 10
    else if (runwayDays >= 20) score += 5
    else score -= 15

    score = Math.min(100, Math.max(10, score))

    let healthStatus = "Healthy"
    let healthColor = "text-emerald-500"
    if (score >= 80) {
      healthStatus = "Exceptional"
      healthColor = "text-emerald-500"
    } else if (score >= 65) {
      healthStatus = "Healthy"
      healthColor = "text-blue-500"
    } else if (score >= 50) {
      healthStatus = "Moderate"
      healthColor = "text-amber-500"
    } else {
      healthStatus = "Attention Required"
      healthColor = "text-red-500"
    }

    return {
      income,
      expense,
      investment,
      netSavings,
      savingsRate,
      incomeDelta,
      expenseDelta,
      dailyBurnRate,
      runwayDays,
      healthScore: score,
      healthStatus,
      healthColor,
      transactionCount: filteredTransactions.length,
    }
  }, [filteredTransactions, priorPeriodTransactions, startDate, endDate, balanceData])

  // ─── Time Series Data (Monthly / Weekly / Daily) ──────────────────────────
  const timeSeriesData = useMemo(() => {
    const buckets: Record<string, { label: string; rawDate: string; income: number; expense: number; net: number }> = {}

    filteredTransactions.forEach((t) => {
      const date = new Date(t.date)
      let key = ""
      let label = ""

      if (granularity === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        label = new Date(key + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      } else if (granularity === "weekly") {
        const startOfWeek = new Date(date)
        startOfWeek.setDate(date.getDate() - date.getDay())
        key = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, "0")}-${String(startOfWeek.getDate()).padStart(2, "0")}`
        label = `Wk ${startOfWeek.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}`
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        label = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      }

      if (!buckets[key]) {
        buckets[key] = { label, rawDate: key, income: 0, expense: 0, net: 0 }
      }

      if (t.type === "income") {
        buckets[key].income += Number(t.amount)
      } else if (t.type === "expense") {
        buckets[key].expense += Number(t.amount)
      }
    })

    const sorted = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => {
        val.net = val.income - val.expense
        return val
      })

    // Running cumulative wealth
    let runningCumulative = 0
    return sorted.map((item) => {
      runningCumulative += item.net
      return {
        ...item,
        cumulative: runningCumulative,
      }
    })
  }, [filteredTransactions, granularity])

  // ─── Category Breakdown ──────────────────────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, { value: number; count: number }> = {}
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const cat = t.category || "Uncategorized"
        if (!totals[cat]) totals[cat] = { value: 0, count: 0 }
        totals[cat].value += Number(t.amount)
        totals[cat].count += 1
      })

    const totalExp = Object.values(totals).reduce((sum, c) => sum + c.value, 0)

    return Object.entries(totals)
      .map(([name, data]) => ({
        name,
        value: data.value,
        count: data.count,
        percentage: totalExp > 0 ? (data.value / totalExp) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  // ─── Payment Methods Breakdown ───────────────────────────────────────────
  const paymentMethodBreakdown = useMemo(() => {
    const totals: Record<string, { value: number; count: number }> = {}
    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const method = (t.paymentMethod || "other").toLowerCase()
        if (!totals[method]) totals[method] = { value: 0, count: 0 }
        totals[method].value += Number(t.amount)
        totals[method].count += 1
      })

    const totalExp = Object.values(totals).reduce((sum, c) => sum + c.value, 0)

    return Object.entries(totals)
      .map(([name, data]) => ({
        name,
        label: name.replace("_", " ").toUpperCase(),
        value: data.value,
        count: data.count,
        percentage: totalExp > 0 ? (data.value / totalExp) * 100 : 0,
        color: METHOD_COLORS[name] || "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value)
  }, [filteredTransactions])

  // ─── Day-of-Week Velocity ────────────────────────────────────────────────
  const dayOfWeekVelocity = useMemo(() => {
    const days = DAY_NAMES.map((name) => ({ day: name, total: 0, count: 0, avg: 0 }))

    filteredTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const dayIdx = new Date(t.date).getDay()
        days[dayIdx].total += Number(t.amount)
        days[dayIdx].count += 1
      })

    days.forEach((d) => {
      d.avg = d.count > 0 ? Math.round(d.total / d.count) : 0
    })

    const peakDay = [...days].sort((a, b) => b.total - a.total)[0]

    return { days, peakDay }
  }, [filteredTransactions])

  // ─── Top 10 Largest Outflows ─────────────────────────────────────────────
  const topOutflows = useMemo(() => {
    return [...filteredTransactions]
      .filter((t) => t.type === "expense")
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10)
  }, [filteredTransactions])

  // ─── Predictive Run-Rate & Future Forecast ───────────────────────────────
  const futureForecast = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const currentDay = now.getDate()
    const remainingDays = totalDaysInMonth - currentDay

    // Current month expense so far
    const currentMonthExpense = transactions
      .filter((t) => {
        const d = new Date(t.date)
        return t.type === "expense" && d.getFullYear() === currentYear && d.getMonth() === currentMonth
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const projectedMonthEnd = currentDay > 0 ? (currentMonthExpense / currentDay) * totalDaysInMonth : 0

    // Average monthly income over the past 3 months
    const threeMonthsAgo = new Date(now)
    threeMonthsAgo.setMonth(now.getMonth() - 3)
    const recentIncome = transactions
      .filter((t) => t.type === "income" && new Date(t.date) >= threeMonthsAgo)
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const avgMonthlyIncome = Math.max(30000, recentIncome / 3)

    const remainingBudgetForMonth = Math.max(0, avgMonthlyIncome - currentMonthExpense)
    const safeDailyAllowance = remainingDays > 0 ? Math.round(remainingBudgetForMonth / remainingDays) : 0

    // 3-Month Forward Projection points
    const forwardMonths = [1, 2, 3].map((offset) => {
      const futureDate = new Date(currentYear, currentMonth + offset, 1)
      const label = futureDate.toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      return {
        label: `${label} (Proj)`,
        projectedIncome: Math.round(avgMonthlyIncome),
        projectedExpense: Math.round(projectedMonthEnd),
        projectedSavings: Math.round(avgMonthlyIncome - projectedMonthEnd),
      }
    })

    return {
      currentDay,
      totalDaysInMonth,
      remainingDays,
      currentMonthExpense,
      projectedMonthEnd,
      safeDailyAllowance,
      forwardMonths,
    }
  }, [transactions])

  // ─── AI Diagnostics Trigger ──────────────────────────────────────────────
  const handleRunAiDiagnosis = async () => {
    setIsLoadingAi(true)
    try {
      const topSample = filteredTransactions.slice(0, 40).map((t) => ({
        date: t.date,
        type: t.type,
        category: t.category,
        amount: Number(t.amount),
        description: t.description || "",
        paymentMethod: t.paymentMethod,
      }))

      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "finance",
          data: topSample,
          totalBalance: balanceData?.realBalance ?? 0,
          currency: "₹",
        }),
      })

      const data = await res.json()
      if (data.insights && Array.isArray(data.insights)) {
        setAiInsights(data.insights)
        toast({
          title: "AI Analysis Complete",
          description: `Generated ${data.insights.length} personalized financial insights.`,
        })
      } else {
        throw new Error(data.error || "Failed to generate AI insights")
      }
    } catch (err: any) {
      toast({
        title: "AI Diagnosis Notice",
        description: err.message || "Using local smart diagnostics.",
      })
      // Fallback local smart insights if offline
      setAiInsights([
        {
          id: "local_1",
          title: "Spending Velocity Alert",
          description: `Your average daily spend is ₹${kpis.dailyBurnRate.toFixed(0)}. At this rate, your estimated runway is ${kpis.runwayDays} days.`,
          severity: kpis.runwayDays < 30 ? "high" : "medium",
          actionLabel: "Review Budget Caps",
        },
        {
          id: "local_2",
          title: `Peak Spend on ${dayOfWeekVelocity.peakDay?.day || "Weekends"}`,
          description: `${dayOfWeekVelocity.peakDay?.day || "Weekend"} spending accounts for a significant portion of discretionary outflow. Consider setting a dedicated weekend leisure cap.`,
          severity: "low",
          actionLabel: "Optimize Discretionary",
        },
        {
          id: "local_3",
          title: "Savings Rate Trajectory",
          description: `You are currently saving ${kpis.savingsRate.toFixed(1)}% of your income. Increasing this to 20%+ guarantees accelerated financial independence.`,
          severity: kpis.savingsRate >= 20 ? "low" : "medium",
          actionLabel: "Increase Sinking Fund",
        },
      ])
    } finally {
      setIsLoadingAi(false)
    }
  }

  // ─── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: "No Data", description: "No transactions in filtered period.", variant: "destructive" })
      return
    }

    const headers = ["Date", "Type", "Category", "Description", "Amount", "Payment Method"]
    const rows = filteredTransactions.map((t) => [
      new Date(t.date).toLocaleDateString("en-IN"),
      t.type,
      t.category,
      t.description || "",
      t.amount,
      t.paymentMethod || "other",
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Aura360_Analytics_${datePreset}_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Report Exported",
      description: `Downloaded ${filteredTransactions.length} records.`,
    })
  }

  const handleResetFilters = () => {
    setDatePreset("6M")
    setCustomStartDate("")
    setCustomEndDate("")
    setGranularity("monthly")
    setSelectedCategory("ALL")
    setSelectedPaymentMethod("ALL")
    setSelectedType("ALL")
  }

  const hasActiveFilters =
    datePreset !== "6M" ||
    selectedCategory !== "ALL" ||
    selectedPaymentMethod !== "ALL" ||
    selectedType !== "ALL" ||
    granularity !== "monthly"

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4 pb-20")}>
      {/* ─── Top Bar: Title & Primary Actions ─────────────────────────── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Financial Intelligence Hub</h2>
            <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider text-primary border-primary/30">
              Pro Analytics
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
            Real-time cashflow, day-of-week velocity, category distribution & predictive runway
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs h-9 text-muted-foreground hover:text-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs h-9 gap-1.5 font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            size="sm"
            onClick={handleRunAiDiagnosis}
            disabled={isLoadingAi}
            className="text-xs h-9 gap-1.5 font-bold shadow-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
          >
            {isLoadingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            AI Diagnosis
          </Button>
        </div>
      </div>

      {/* ─── Interactive Multi-Filter Bar ─────────────────────────────── */}
      <Card className="backdrop-blur-sm bg-card/80 border-border shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Date Range Preset Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Range:
              </span>
              {(["30D", "3M", "6M", "1Y", "YTD", "ALL", "CUSTOM"] as DatePreset[]).map((preset) => (
                <Button
                  key={preset}
                  variant={datePreset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDatePreset(preset)}
                  className={cn(
                    "h-7 text-[11px] px-2.5 rounded-full",
                    datePreset === preset ? "font-bold shadow-xs" : "text-muted-foreground"
                  )}
                >
                  {preset}
                </Button>
              ))}
            </div>

            {/* Granularity Switcher */}
            <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border text-xs">
              <span className="text-[11px] font-medium text-muted-foreground px-2">Granularity:</span>
              {(["monthly", "weekly", "daily"] as Granularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-all",
                    granularity === g
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Filter Dropdowns & Custom Date Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-border/50">
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {availableCategories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Payment Method Filter */}
            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Payment Methods</SelectItem>
                {availablePaymentMethods.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.replace("_", " ").toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Transaction Types</SelectItem>
                <SelectItem value="expense">Expenses Only</SelectItem>
                <SelectItem value="income">Income Only</SelectItem>
                <SelectItem value="investment">Investments Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Matching Result Count Tag */}
            <div className="flex items-center justify-between sm:justify-end px-3 py-1 bg-muted/40 rounded-md border text-xs">
              <span className="text-muted-foreground">Matching:</span>
              <span className="font-bold text-foreground ml-1.5">{kpis.transactionCount} records</span>
            </div>
          </div>

          {/* Custom Date Pickers when CUSTOM is chosen */}
          {datePreset === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40 animate-in fade-in-50">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">Start:</span>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">End:</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-8 w-36 text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Executive KPI Summary Grid ──────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Inflow */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Inflow</span>
              <div className="w-7 h-7 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-xl md:text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{kpis.income.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              {kpis.incomeDelta > 0 ? (
                <span className="text-green-600 font-semibold flex items-center">
                  <ArrowUp className="h-3 w-3" />+{kpis.incomeDelta.toFixed(1)}%
                </span>
              ) : kpis.incomeDelta < 0 ? (
                <span className="text-red-500 font-semibold flex items-center">
                  <ArrowDown className="h-3 w-3" />{kpis.incomeDelta.toFixed(1)}%
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">0% change</span>
              )}
              <span>vs prior period</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Outflow */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Outflow</span>
              <div className="w-7 h-7 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className="text-xl md:text-2xl font-bold text-red-600 dark:text-red-400">
              ₹{kpis.expense.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
              {kpis.expenseDelta > 0 ? (
                <span className="text-red-500 font-semibold flex items-center">
                  <ArrowUp className="h-3 w-3" />+{kpis.expenseDelta.toFixed(1)}%
                </span>
              ) : kpis.expenseDelta < 0 ? (
                <span className="text-green-600 font-semibold flex items-center">
                  <ArrowDown className="h-3 w-3" />{kpis.expenseDelta.toFixed(1)}%
                </span>
              ) : (
                <span className="text-muted-foreground font-medium">0% change</span>
              )}
              <span>vs prior period</span>
            </div>
          </CardContent>
        </Card>

        {/* Net Savings & Rate */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Net Savings</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <p className={cn("text-xl md:text-2xl font-bold", kpis.netSavings >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-500")}>
              ₹{kpis.netSavings.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center justify-between mt-1 text-[11px]">
              <span className="text-muted-foreground">Savings Rate:</span>
              <span className={cn("font-bold", kpis.savingsRate >= 20 ? "text-emerald-500" : kpis.savingsRate >= 10 ? "text-amber-500" : "text-red-500")}>
                {kpis.savingsRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={Math.max(0, Math.min(100, kpis.savingsRate))} className="h-1.5 mt-1.5" />
          </CardContent>
        </Card>

        {/* Burn Rate & Financial Runway */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader className="p-4 pb-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Runway & Health</span>
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-xl md:text-2xl font-bold text-foreground">
                {kpis.runwayDays > 365 ? "> 1 Year" : `${kpis.runwayDays} Days`}
              </p>
              <Badge variant="outline" className={cn("text-[10px] font-bold", kpis.healthColor)}>
                {kpis.healthScore}/100
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
              <span>Daily Spend: ₹{kpis.dailyBurnRate.toFixed(0)}/day</span>
              <span className="font-semibold text-foreground">{kpis.healthStatus}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Sub-Tab Navigation Perspectives ─────────────────────────── */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-11 bg-secondary/70 p-1 border">
          <TabsTrigger value="trends" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="h-3.5 w-3.5" />
            Trends & Cashflow
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
            <PieChartIcon className="h-3.5 w-3.5" />
            Categories & Channels
          </TabsTrigger>
          <TabsTrigger value="velocity" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Activity className="h-3.5 w-3.5" />
            Velocity & Outflows
          </TabsTrigger>
          <TabsTrigger value="forecast" className="gap-1.5 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Future & AI Insights
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Cashflow & Trends ───────────────────────────────── */}
        <TabsContent value="trends" className="space-y-4 mt-4">
          <Card className="backdrop-blur-sm bg-card/80 border-border">
            <CardHeader className="p-4 md:p-6 pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    Cashflow Trajectory ({granularity})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Comparison of total income received against total expenses incurred
                  </CardDescription>
                </div>

                {/* Chart View Toggle */}
                <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border text-xs">
                  <button
                    onClick={() => setChartMode("bar")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                      chartMode === "bar" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Bars
                  </button>
                  <button
                    onClick={() => setChartMode("area")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                      chartMode === "area" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Net Flow
                  </button>
                  <button
                    onClick={() => setChartMode("cumulative")}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all",
                      chartMode === "cumulative" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    )}
                  >
                    Cumulative
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 md:p-6 pt-2">
              {timeSeriesData.length > 0 ? (
                <div className={cn("w-full min-w-0 overflow-hidden", isMobile ? "h-64" : "h-80")}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                    {chartMode === "bar" ? (
                      <BarChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                        <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          width={isMobile ? 45 : 55}
                        />
                        <Tooltip
                          formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: isMobile ? 12 : 13,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: "8px" }} />
                        <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                        <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      </BarChart>
                    ) : chartMode === "area" ? (
                      <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                        <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          width={isMobile ? 45 : 55}
                        />
                        <Tooltip
                          formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: isMobile ? 12 : 13,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: "8px" }} />
                        <Area
                          type="monotone"
                          dataKey="net"
                          name="Net Flow (Income - Expense)"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#netFlowGrad)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    ) : (
                      <AreaChart data={timeSeriesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="cumulGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                        <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
                        <YAxis
                          tick={{ fontSize: isMobile ? 10 : 12 }}
                          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                          width={isMobile ? 45 : 55}
                        />
                        <Tooltip
                          formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            fontSize: isMobile ? 12 : 13,
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: isMobile ? 11 : 12, paddingTop: "8px" }} />
                        <Area
                          type="monotone"
                          dataKey="cumulative"
                          name="Cumulative Net Savings Growth"
                          stroke="#8b5cf6"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#cumulGrad)"
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground text-sm">
                  No transactions found for the selected filter range.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Tab 2: Categories & Channels ───────────────────────────── */}
        <TabsContent value="categories" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Category Donut & Ranks */}
            <Card className="backdrop-blur-sm bg-card/80 border-border">
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 text-purple-500" />
                  Expense Category Distribution
                </CardTitle>
                <CardDescription className="text-xs">
                  Breakdown of where your capital was deployed
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 space-y-4">
                {categoryBreakdown.length > 0 ? (
                  <>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {categoryBreakdown.map((_, index) => (
                              <Cell key={`cat-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                            contentStyle={{
                              backgroundColor: "var(--background)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {categoryBreakdown.map((cat, idx) => (
                        <div key={cat.name} className="flex items-center justify-between text-xs p-1.5 rounded-md hover:bg-muted/40 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                            />
                            <span className="font-medium truncate">{cat.name}</span>
                            <span className="text-muted-foreground text-[10px]">({cat.count}x)</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold">₹{cat.value.toLocaleString("en-IN")}</span>
                            <span className="text-muted-foreground text-[10px] ml-1.5">({cat.percentage.toFixed(1)}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-xs">No expense data</div>
                )}
              </CardContent>
            </Card>

            {/* Payment Method Channels */}
            <Card className="backdrop-blur-sm bg-card/80 border-border">
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-500" />
                  Payment Channels & Wallets
                </CardTitle>
                <CardDescription className="text-xs">
                  Physical source of outflow (UPI, Bank, Card, Cash)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 space-y-4">
                {paymentMethodBreakdown.length > 0 ? (
                  <>
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={paymentMethodBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {paymentMethodBreakdown.map((entry, index) => (
                              <Cell key={`pm-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                            contentStyle={{
                              backgroundColor: "var(--background)",
                              border: "1px solid var(--border)",
                              borderRadius: "8px",
                              fontSize: 12,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5">
                      {paymentMethodBreakdown.map((pm) => (
                        <div key={pm.name} className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pm.color }} />
                            <div>
                              <p className="text-xs font-bold leading-none">{pm.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{pm.count} transactions</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold">₹{pm.value.toLocaleString("en-IN")}</p>
                            <p className="text-[10px] text-muted-foreground">{pm.percentage.toFixed(1)}% of expenses</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-xs">No payment channel data</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 3: Velocity & Patterns ─────────────────────────────── */}
        <TabsContent value="velocity" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Day of Week Velocity */}
            <Card className="backdrop-blur-sm bg-card/80 border-border">
              <CardHeader className="p-4 md:p-6 pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      Day-of-Week Spending Velocity
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Average expenditure by day of the week
                    </CardDescription>
                  </div>
                  {dayOfWeekVelocity.peakDay && (
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-500">
                      Peak: {dayOfWeekVelocity.peakDay.day}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayOfWeekVelocity.days} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                      <Tooltip
                        formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="total" name="Total Spend" fill="#f59e0b" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-muted-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>
                    Highest aggregate outflow occurs on <strong>{dayOfWeekVelocity.peakDay?.day}</strong> (₹
                    {dayOfWeekVelocity.peakDay?.total.toLocaleString("en-IN")}).
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Top 10 Largest Outflows */}
            <Card className="backdrop-blur-sm bg-card/80 border-border">
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-500" />
                  Top Largest Outflows
                </CardTitle>
                <CardDescription className="text-xs">
                  Largest single transactions in the filtered period
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {topOutflows.map((t, idx) => (
                    <div
                      key={t.id}
                      className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex items-center justify-between hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-red-500/10 text-red-500 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">{t.category}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {t.description || "No description"} • {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-red-600 dark:text-red-400 shrink-0 ml-2">
                        -₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Tab 4: Future Forecast & AI Insights ───────────────────── */}
        <TabsContent value="forecast" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Safe Daily Allowance & Current Month Run Rate */}
            <Card className="backdrop-blur-sm bg-card/80 border-border lg:col-span-1">
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Monthly Run-Rate Pace
                </CardTitle>
                <CardDescription className="text-xs">
                  Remaining day allowance & month-end trajectory
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2 space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Safe Daily Allowance</p>
                  <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                    ₹{futureForecast.safeDailyAllowance.toLocaleString("en-IN")}
                    <span className="text-xs font-medium text-muted-foreground">/day</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    for the remaining {futureForecast.remainingDays} days of this month
                  </p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Days Elapsed:</span>
                    <span className="font-bold">
                      {futureForecast.currentDay} / {futureForecast.totalDaysInMonth} days
                    </span>
                  </div>
                  <Progress value={(futureForecast.currentDay / futureForecast.totalDaysInMonth) * 100} className="h-2" />

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-muted-foreground">Spent So Far:</span>
                    <span className="font-bold">₹{futureForecast.currentMonthExpense.toLocaleString("en-IN")}</span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground">Projected Month-End:</span>
                    <span className="font-bold text-red-500">₹{futureForecast.projectedMonthEnd.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3-Month Forward Predictive Trajectory Chart */}
            <Card className="backdrop-blur-sm bg-card/80 border-border lg:col-span-2">
              <CardHeader className="p-4 md:p-6 pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  3-Month Forward Predictive Trajectory
                </CardTitle>
                <CardDescription className="text-xs">
                  Forecast based on moving run-rate & recurring commitments
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-2">
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={futureForecast.forwardMonths} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} width={45} />
                      <Tooltip
                        formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`}
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          border: "1px solid var(--border)",
                          borderRadius: "8px",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: "6px" }} />
                      <Bar dataKey="projectedIncome" name="Expected Income" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="projectedExpense" name="Projected Spend" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      <Bar dataKey="projectedSavings" name="Estimated Savings" fill="#3b82f6" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Financial Health & Diagnostics Section */}
          <Card className="backdrop-blur-sm bg-card/80 border-border">
            <CardHeader className="p-4 md:p-6 pb-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    Gemini AI Financial Diagnosis
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Autonomous anomaly detection, leak identification, and optimization recommendations
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={handleRunAiDiagnosis}
                  disabled={isLoadingAi}
                  className="text-xs h-8 gap-1.5 font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {isLoadingAi ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {aiInsights ? "Refresh Diagnosis" : "Run Diagnosis"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-2">
              {aiInsights && aiInsights.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {aiInsights.map((insight, idx) => (
                    <div
                      key={insight.id || idx}
                      className={cn(
                        "p-4 rounded-xl border flex flex-col justify-between transition-all",
                        insight.severity === "high"
                          ? "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100"
                          : insight.severity === "medium"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                          : "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-100"
                      )}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold uppercase",
                              insight.severity === "high"
                                ? "border-red-500/50 text-red-500"
                                : insight.severity === "medium"
                                ? "border-amber-500/50 text-amber-500"
                                : "border-blue-500/50 text-blue-500"
                            )}
                          >
                            {insight.severity || "Insight"}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-bold">{insight.title}</h4>
                        <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">{insight.description}</p>
                      </div>

                      {insight.actionLabel && (
                        <div className="pt-3 mt-3 border-t border-border/30 flex items-center justify-between text-[11px] font-bold text-primary">
                          <span>{insight.actionLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center bg-muted/20 border rounded-xl border-dashed">
                  <Sparkles className="h-8 w-8 text-indigo-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-semibold">No AI Diagnosis active yet</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto mt-0.5 mb-3">
                    Click "Run Diagnosis" above to analyze your spending history with Gemini for spending leaks and savings opportunities.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRunAiDiagnosis}
                    disabled={isLoadingAi}
                    className="text-xs h-8 gap-1.5"
                  >
                    {isLoadingAi ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Analyze Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
