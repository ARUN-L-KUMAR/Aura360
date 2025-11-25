"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  CartesianGrid,
} from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  user_id: string
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  description: string | null
  date: string
  needs_review: boolean
  created_at: string
  updated_at: string
}

interface BalanceData {
  cash_balance: number
  account_balance: number
}

interface ReportsTabProps {
  transactions: Transaction[]
  balanceData?: BalanceData | null
}

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"
]

export function ReportsTab({ transactions, balanceData }: ReportsTabProps) {
  const isMobile = useIsMobile()
  
  // Monthly Income vs Expense data
  const monthlyData = useMemo(() => {
    const data: Record<string, { month: string; income: number; expense: number; savings: number }> = {}

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = new Date(monthKey + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })

      if (!data[monthKey]) {
        data[monthKey] = { month: monthLabel, income: 0, expense: 0, savings: 0 }
      }

      if (t.type === "income") {
        data[monthKey].income += Number(t.amount)
      } else if (t.type === "expense") {
        data[monthKey].expense += Number(t.amount)
      }
    })

    // Calculate savings
    Object.values(data).forEach((d) => {
      d.savings = d.income - d.expense
    })

    return Object.entries(data)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, value]) => value)
      .slice(-12) // Last 12 months
  }, [transactions])

  // Category breakdown for expenses
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {}
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
      })

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Wallet breakdown
  const walletBreakdown = useMemo(() => {
    if (!balanceData) return []
    return [
      { name: "Bank / UPI", value: balanceData.account_balance, color: "#3b82f6" },
      { name: "Cash", value: balanceData.cash_balance, color: "#22c55e" },
    ]
  }, [balanceData])

  // Smart stats
  const smartStats = useMemo(() => {
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`

    // Total transactions
    const totalTransactions = transactions.length

    // Current month expenses
    const currentMonthExpenses = transactions
      .filter((t) => {
        const tDate = new Date(t.date)
        return t.type === "expense" && 
          `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}` === currentMonth
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Last month expenses
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`
    const lastMonthExpenses = transactions
      .filter((t) => {
        const tDate = new Date(t.date)
        return t.type === "expense" && 
          `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}` === lastMonthKey
      })
      .reduce((sum, t) => sum + Number(t.amount), 0)

    // Spending change %
    const spendingChange = lastMonthExpenses > 0 
      ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : 0

    // Highest spending category this month
    const currentMonthCategories: Record<string, number> = {}
    transactions
      .filter((t) => {
        const tDate = new Date(t.date)
        return t.type === "expense" && 
          `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, "0")}` === currentMonth
      })
      .forEach((t) => {
        currentMonthCategories[t.category] = (currentMonthCategories[t.category] || 0) + Number(t.amount)
      })
    
    const highestCategory = Object.entries(currentMonthCategories)
      .sort(([, a], [, b]) => b - a)[0]

    // Top 5 biggest spends
    const top5Spends = [...transactions]
      .filter((t) => t.type === "expense")
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5)

    // Best saving month
    const monthlySavings: Record<string, { label: string; savings: number }> = {}
    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      const monthLabel = new Date(monthKey + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })

      if (!monthlySavings[monthKey]) {
        monthlySavings[monthKey] = { label: monthLabel, savings: 0 }
      }

      if (t.type === "income") {
        monthlySavings[monthKey].savings += Number(t.amount)
      } else if (t.type === "expense") {
        monthlySavings[monthKey].savings -= Number(t.amount)
      }
    })

    const bestSavingMonth = Object.values(monthlySavings)
      .sort((a, b) => b.savings - a.savings)[0]

    return {
      totalTransactions,
      currentMonthExpenses,
      spendingChange,
      highestCategory: highestCategory ? { name: highestCategory[0], amount: highestCategory[1] } : null,
      top5Spends,
      bestSavingMonth,
    }
  }, [transactions])

  const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.value, 0)

  return (
    <div className={cn("space-y-6", isMobile && "space-y-4 pb-20")}>
      {/* Monthly Insights Section */}
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader className={cn(isMobile && "p-4 pb-2")}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-base" : ""
          )}>
            <BarChart3 className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-blue-600")} />
            Monthly Insights
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-6", isMobile && "p-4 pt-2 space-y-4")}>
          {/* Income vs Expense Bar Chart */}
          {monthlyData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Income vs Expense</h3>
              <div className={cn(isMobile ? "h-48" : "h-64")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      width={isMobile ? 45 : 60}
                    />
                    <Tooltip
                      formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: isMobile ? 12 : 14 }}
                    />
                    <Legend wrapperStyle={{ fontSize: isMobile ? 10 : 12 }} />
                    <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Net Savings Line Chart */}
          {monthlyData.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">Net Savings Trend</h3>
              <div className={cn(isMobile ? "h-40" : "h-48")}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      width={isMobile ? 45 : 60}
                    />
                    <Tooltip
                      formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: isMobile ? 12 : 14 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      name="Net Savings"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6", strokeWidth: 2, r: isMobile ? 3 : 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Spending Change */}
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-1" : "sm:grid-cols-3"
          )}>
            <div className={cn("p-4 rounded-lg bg-muted/50 border", isMobile && "p-3")}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-muted-foreground")} />
                <span className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>This Month Spending</span>
              </div>
              <p className={cn(
                "font-bold text-red-600",
                isMobile ? "text-xl" : "text-2xl"
              )}>
                ₹{smartStats.currentMonthExpenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className={cn("p-4 rounded-lg bg-muted/50 border", isMobile && "p-3")}>
              <div className="flex items-center gap-2 mb-2">
                {smartStats.spendingChange > 0 ? (
                  <ArrowUp className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-red-600")} />
                ) : smartStats.spendingChange < 0 ? (
                  <ArrowDown className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-green-600")} />
                ) : (
                  <Minus className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-muted-foreground")} />
                )}
                <span className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>vs Last Month</span>
              </div>
              <p className={cn(
                "font-bold",
                isMobile ? "text-xl" : "text-2xl",
                smartStats.spendingChange > 0 ? "text-red-600" : smartStats.spendingChange < 0 ? "text-green-600" : "text-muted-foreground"
              )}>
                {smartStats.spendingChange > 0 ? "+" : ""}{smartStats.spendingChange.toFixed(1)}%
              </p>
            </div>

            <div className={cn("p-4 rounded-lg bg-muted/50 border", isMobile && "p-3")}>
              <div className="flex items-center gap-2 mb-2">
                <Hash className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-muted-foreground")} />
                <span className={cn(
                  "font-medium text-muted-foreground",
                  isMobile ? "text-xs" : "text-sm"
                )}>Total Transactions</span>
              </div>
              <p className={cn("font-bold", isMobile ? "text-xl" : "text-2xl")}>
                {smartStats.totalTransactions}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader className={cn(isMobile && "p-4 pb-2")}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-base" : ""
          )}>
            <PieChartIcon className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-purple-600")} />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className={cn(isMobile && "p-4 pt-2")}>
          {categoryBreakdown.length > 0 ? (
            <div className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1" : "md:grid-cols-2"
            )}>
              {/* Pie Chart */}
              <div className={cn(isMobile ? "h-48" : "h-64")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 35 : 50}
                      outerRadius={isMobile ? 65 : 90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryBreakdown.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: isMobile ? 12 : 14 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Category List */}
              <div className={cn(
                "space-y-2 overflow-y-auto",
                isMobile ? "max-h-48" : "max-h-64"
              )}>
                {categoryBreakdown.map((cat, index) => (
                  <div
                    key={cat.name}
                    className={cn(
                      "flex items-center justify-between rounded-lg hover:bg-muted/50 transition-colors",
                      isMobile ? "p-1.5" : "p-2"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(isMobile ? "w-2.5 h-2.5" : "w-3 h-3", "rounded-full")}
                        style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                      />
                      <span className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <p className={cn("font-semibold", isMobile ? "text-xs" : "text-sm")}>
                        ₹{cat.value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </p>
                      <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                        {((cat.value / totalExpenses) * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className={cn("text-center text-muted-foreground py-8", isMobile && "py-4 text-sm")}>No expense data available</p>
          )}
        </CardContent>
      </Card>

      {/* Wallet Breakdown */}
      {balanceData && (
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(isMobile && "p-4 pb-2")}>
            <CardTitle className={cn(
              "flex items-center gap-2",
              isMobile ? "text-base" : ""
            )}>
              <Wallet className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-blue-600")} />
              Wallet Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className={cn(isMobile && "p-4 pt-2")}>
            <div className={cn(
              "grid gap-6",
              isMobile ? "grid-cols-1" : "md:grid-cols-2"
            )}>
              {/* Pie Chart */}
              <div className={cn(isMobile ? "h-36" : "h-48")}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={walletBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 55 : 70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {walletBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
                      contentStyle={{ backgroundColor: "var(--background)", border: "1px solid var(--border)", fontSize: isMobile ? 12 : 14 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Wallet Details */}
              <div className={cn("space-y-4", isMobile && "space-y-3")}>
                <div className={cn(
                  "flex items-center justify-between rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800",
                  isMobile ? "p-3" : "p-4"
                )}>
                  <div className="flex items-center gap-2">
                    <span className={cn(isMobile ? "text-lg" : "text-2xl")}>💳</span>
                    <span className={cn("font-medium", isMobile && "text-sm")}>Bank / UPI</span>
                  </div>
                  <span className={cn(
                    "font-bold text-blue-600 dark:text-blue-400",
                    isMobile ? "text-base" : "text-xl"
                  )}>
                    ₹{balanceData.account_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={cn(
                  "flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800",
                  isMobile ? "p-3" : "p-4"
                )}>
                  <div className="flex items-center gap-2">
                    <span className={cn(isMobile ? "text-lg" : "text-2xl")}>💵</span>
                    <span className={cn("font-medium", isMobile && "text-sm")}>Cash in Hand</span>
                  </div>
                  <span className={cn(
                    "font-bold text-green-600 dark:text-green-400",
                    isMobile ? "text-base" : "text-xl"
                  )}>
                    ₹{balanceData.cash_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Smart Stats */}
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader className={cn(isMobile && "p-4 pb-2")}>
          <CardTitle className={cn(
            "flex items-center gap-2",
            isMobile ? "text-base" : ""
          )}>
            <Award className={cn(isMobile ? "w-4 h-4" : "w-5 h-5", "text-amber-600")} />
            Smart Stats
          </CardTitle>
        </CardHeader>
        <CardContent className={cn("space-y-6", isMobile && "p-4 pt-2 space-y-4")}>
          {/* Highlight Cards */}
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-1" : "sm:grid-cols-2"
          )}>
            {/* Highest Spending Category */}
            {smartStats.highestCategory && (
              <div className={cn(
                "rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800",
                isMobile ? "p-3" : "p-4"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Flame className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-red-600")} />
                  <span className={cn(
                    "font-medium text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>Highest Spending Category</span>
                </div>
                <p className={cn("font-bold", isMobile ? "text-base" : "text-lg")}>{smartStats.highestCategory.name}</p>
                <p className={cn("text-red-600 dark:text-red-400", isMobile ? "text-xs" : "text-sm")}>
                  ₹{smartStats.highestCategory.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })} this month
                </p>
              </div>
            )}

            {/* Best Saving Month */}
            {smartStats.bestSavingMonth && (
              <div className={cn(
                "rounded-lg bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800",
                isMobile ? "p-3" : "p-4"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4", "text-green-600")} />
                  <span className={cn(
                    "font-medium text-muted-foreground",
                    isMobile ? "text-xs" : "text-sm"
                  )}>Best Saving Month</span>
                </div>
                <p className={cn("font-bold", isMobile ? "text-base" : "text-lg")}>{smartStats.bestSavingMonth.label}</p>
                <p className={cn("text-green-600 dark:text-green-400", isMobile ? "text-xs" : "text-sm")}>
                  ₹{smartStats.bestSavingMonth.savings.toLocaleString("en-IN", { minimumFractionDigits: 2 })} saved
                </p>
              </div>
            )}
          </div>

          {/* Top 5 Biggest Spends */}
          {smartStats.top5Spends.length > 0 && (
            <div>
              <h3 className={cn(
                "font-medium text-muted-foreground mb-3 flex items-center gap-2",
                isMobile ? "text-xs" : "text-sm"
              )}>
                <TrendingDown className={cn(isMobile ? "w-3.5 h-3.5" : "w-4 h-4")} />
                Top 5 Biggest Spends
              </h3>
              <div className="space-y-2">
                {smartStats.top5Spends.map((t, index) => (
                  <div
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg bg-muted/50 border",
                      isMobile ? "p-2" : "p-3"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center font-bold text-red-600",
                        isMobile ? "w-5 h-5 text-[10px]" : "w-6 h-6 text-xs"
                      )}>
                        {index + 1}
                      </span>
                      <div>
                        <p className={cn("font-medium", isMobile ? "text-xs" : "text-sm")}>{t.category}</p>
                        <p className={cn("text-muted-foreground", isMobile ? "text-[10px]" : "text-xs")}>
                          {t.description || "No description"} • {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                    </div>
                    <span className={cn("font-bold text-red-600", isMobile ? "text-xs" : "")}>
                      ₹{Number(t.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
