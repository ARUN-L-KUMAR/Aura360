"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, CheckCircle2, Target, Banknote } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { EditBalanceDialog } from "./edit-balance-dialog"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts"
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

interface FinanceOverviewTabProps {
  transactions: Transaction[]
}

interface BalanceData {
  id: string | null
  cash_balance: number
  account_balance: number
  real_balance: number
  expected_balance: number
  difference: number
  updated_at: string | null
}

const EXPENSE_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6",
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"
]

export function FinanceOverviewTab({ transactions }: FinanceOverviewTabProps) {
  const isMobile = useIsMobile()
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Fetch balance data on mount and when transactions change
  useEffect(() => {
    fetchBalanceData()
  }, [transactions])

  const fetchBalanceData = async () => {
    try {
      setIsLoadingBalance(true)
      setBalanceError(null)
      const response = await fetch("/api/finance/balances")
      const result = await response.json()

      if (response.status === 503) {
        setBalanceError(result.hint || "Balance table needs to be initialized")
        setBalanceData(null)
        return
      }

      if (response.ok && result.data) {
        setBalanceData(result.data)
      } else {
        setBalanceData({
          id: null,
          cash_balance: 0,
          account_balance: 0,
          real_balance: 0,
          expected_balance: 0,
          difference: 0,
          updated_at: null,
        })
      }
    } catch (error) {
      console.error("Error fetching balance data:", error)
      setBalanceError("Failed to load balance data")
    } finally {
      setIsLoadingBalance(false)
    }
  }

  const stats = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const investments = transactions
      .filter((t) => t.type === "investment")
      .reduce((sum, t) => sum + Number(t.amount), 0)

    const requiredBalance = income - expenses - investments

    return { income, expenses, investments, requiredBalance }
  }, [transactions])

  // Category spending breakdown for pie chart
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {}
    transactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount)
      })

    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8) // Top 8 categories
  }, [transactions])

  // Monthly savings trend for bar chart
  const monthlySavings = useMemo(() => {
    const monthlyData: Record<string, { income: number; expense: number }> = {}

    transactions.forEach((t) => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 }
      }

      if (t.type === "income") {
        monthlyData[monthKey].income += Number(t.amount)
      } else if (t.type === "expense") {
        monthlyData[monthKey].expense += Number(t.amount)
      }
    })

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-IN", { month: "short" }),
        savings: data.income - data.expense,
      }))
      .slice(-6) // Last 6 months
  }, [transactions])

  const availableBalance = balanceData?.real_balance ?? 0
  const difference = availableBalance - stats.requiredBalance

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) return "text-green-600 dark:text-green-400"
    if (diff > 0) return "text-green-600 dark:text-green-400"
    return "text-red-600 dark:text-red-400"
  }

  const getDifferenceBgColor = (diff: number) => {
    if (diff >= 0) return "bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
    return "bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800"
  }

  const getDifferenceLabel = (diff: number) => {
    if (diff === 0) return "✓ Perfect Match"
    if (diff > 0) return "Extra Money (Not Logged)"
    return "Missing Money"
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Main Stats Cards - Row 1 */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 gap-4"
      )}>
        {/* Total Income */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>Total Income</CardTitle>
            <div className={cn(
              "rounded-lg bg-green-50 dark:bg-green-950/50 flex items-center justify-center",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <TrendingUp className={cn(
                "text-green-600 dark:text-green-400",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            <div className={cn(
              "font-bold text-green-600 dark:text-green-400",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              ₹{stats.income.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>Total Expenses</CardTitle>
            <div className={cn(
              "rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <TrendingDown className={cn(
                "text-red-600 dark:text-red-400",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            <div className={cn(
              "font-bold text-red-600 dark:text-red-400",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              ₹{stats.expenses.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        {/* Investments */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>Investments</CardTitle>
            <div className={cn(
              "rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <PiggyBank className={cn(
                "text-purple-600 dark:text-purple-400",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            <div className={cn(
              "font-bold text-purple-600 dark:text-purple-400",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              ₹{stats.investments.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Section - Row 2 */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 gap-4"
      )}>
        {/* Required Balance */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-blue-500">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>Required Balance</CardTitle>
            <div className={cn(
              "rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center",
              isMobile ? "w-8 h-8" : "w-10 h-10"
            )}>
              <Target className={cn(
                "text-blue-600 dark:text-blue-400",
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            <div className={cn(
              "font-bold text-blue-600 dark:text-blue-400",
              isMobile ? "text-2xl" : "text-3xl"
            )}>
              ₹{stats.requiredBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Income − Expenses − Investments</p>
          </CardContent>
        </Card>

        {/* Available Balance */}
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-purple-500">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <div className="flex items-center justify-between w-full">
              <CardTitle className={cn(
                "font-medium text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>Available Balance</CardTitle>
              {!isLoadingBalance && !balanceError && balanceData && (
                <EditBalanceDialog
                  initialCashBalance={balanceData.cash_balance}
                  initialAccountBalance={balanceData.account_balance}
                  onBalanceUpdated={fetchBalanceData}
                />
              )}
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            {isLoadingBalance ? (
              <div className="text-xl font-bold text-muted-foreground">Loading...</div>
            ) : balanceError ? (
              <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Setup required
              </div>
            ) : (
              <>
                <div className={cn(
                  "font-bold text-purple-600 dark:text-purple-400",
                  isMobile ? "text-2xl" : "text-3xl"
                )}>
                  ₹{availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cash + Bank / UPI</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Difference */}
        <Card className={`backdrop-blur-sm bg-card/80 border ${getDifferenceBgColor(difference)}`}>
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-4" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground flex items-center gap-1",
              isMobile ? "text-xs" : "text-sm"
            )}>
              {difference >= 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              Difference
            </CardTitle>
            <div className={cn(
              "rounded-lg flex items-center justify-center",
              isMobile ? "w-8 h-8" : "w-10 h-10",
              difference >= 0 ? "bg-green-50 dark:bg-green-950/50" : "bg-red-50 dark:bg-red-950/50"
            )}>
              <Banknote className={cn(
                getDifferenceColor(difference),
                isMobile ? "w-4 h-4" : "w-5 h-5"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-4" : ""}>
            {isLoadingBalance || balanceError ? (
              <div className="text-xl font-bold text-muted-foreground">—</div>
            ) : (
              <>
                <div className={cn(
                  "font-bold",
                  isMobile ? "text-2xl" : "text-3xl",
                  getDifferenceColor(difference)
                )}>
                  {difference >= 0 ? "+" : ""}₹{Math.abs(difference).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </div>
                <p className={`text-xs mt-1 font-medium ${getDifferenceColor(difference)}`}>
                  {getDifferenceLabel(difference)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance Breakdown (if available) */}
      {!isLoadingBalance && !balanceError && balanceData && (
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={isMobile ? "pb-2" : "pb-2"}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-xs" : "text-sm"
            )}>Balance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "grid gap-3",
              isMobile ? "grid-cols-1" : "sm:grid-cols-2 gap-4"
            )}>
              <div className={cn(
                "flex items-center justify-between rounded-lg bg-muted/50",
                isMobile ? "p-2.5" : "p-3"
              )}>
                <span className={cn(
                  "font-medium text-muted-foreground flex items-center gap-2",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  <span className={isMobile ? "text-base" : "text-lg"}>💳</span>
                  Bank / UPI
                </span>
                <span className={cn("font-semibold", isMobile ? "text-sm" : "")}>
                  ₹{balanceData.account_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className={cn(
                "flex items-center justify-between rounded-lg bg-muted/50",
                isMobile ? "p-2.5" : "p-3"
              )}>
                <span className={cn(
                  "font-medium text-muted-foreground flex items-center gap-2",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  <span className={isMobile ? "text-base" : "text-lg"}>💵</span>
                  Cash in Hand
                </span>
                <span className={cn("font-semibold", isMobile ? "text-sm" : "")}>
                  ₹{balanceData.cash_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mini Charts Section */}
      <div className={cn(
        "grid gap-3",
        isMobile ? "grid-cols-1" : "md:grid-cols-2 gap-4"
      )}>
        {/* Category Spending Pie Chart */}
        {categoryData.length > 0 && (
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader className={isMobile ? "pb-2" : "pb-2"}>
              <CardTitle className={cn(
                "font-medium text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>
                Spending by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={isMobile ? "h-40" : "h-48"}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={isMobile ? 30 : 40}
                      outerRadius={isMobile ? 55 : 70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) =>
                        `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className={cn(
                "grid gap-2 mt-2",
                isMobile ? "grid-cols-2" : "grid-cols-2"
              )}>
                {categoryData.slice(0, 4).map((cat, index) => (
                  <div key={cat.name} className={cn(
                    "flex items-center gap-2",
                    isMobile ? "text-xs" : "text-xs"
                  )}>
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: EXPENSE_COLORS[index % EXPENSE_COLORS.length] }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Monthly Savings Trend */}
        {monthlySavings.length > 0 && (
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader className={isMobile ? "pb-2" : "pb-2"}>
              <CardTitle className={cn(
                "font-medium text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>
                Monthly Savings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={isMobile ? "h-40" : "h-48"}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySavings}>
                    <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 12 }} />
                    <YAxis 
                      tick={{ fontSize: isMobile ? 10 : 12 }} 
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                      width={isMobile ? 40 : 50}
                    />
                    <Tooltip
                      formatter={(value: number) =>
                        `₹${value.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`
                      }
                    />
                    <Bar
                      dataKey="savings"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Balance Setup Warning */}
      {!isLoadingBalance && balanceError && (
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className={cn(
                  "font-semibold text-yellow-900 dark:text-yellow-100 mb-1",
                  isMobile ? "text-sm" : ""
                )}>
                  ⚠️ Balance System Setup Required
                </p>
                <p className={cn(
                  "text-yellow-800 dark:text-yellow-200 mb-3",
                  isMobile ? "text-xs" : "text-sm"
                )}>
                  {balanceError}
                </p>
                <p className={cn(
                  "text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded font-mono",
                  isMobile ? "text-[10px]" : "text-xs"
                )}>
                  Run this in Supabase SQL Editor:<br />
                  scripts/create-balances-table.sql
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
