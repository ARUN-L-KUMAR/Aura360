"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, CheckCircle2 } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { EditBalanceDialog } from "./edit-balance-dialog"
import { toast } from "sonner"

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

interface FinanceOverviewProps {
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

export function FinanceOverview({ transactions }: FinanceOverviewProps) {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [showBalanceOverview, setShowBalanceOverview] = useState(false)

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
        // Table not initialized
        setBalanceError(result.hint || "Balance table needs to be initialized")
        setBalanceData(null)
        return
      }

      if (response.ok && result.data) {
        setBalanceData(result.data)
      } else {
        // Initialize with default zero balances
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

    const balance = income - expenses - investments

    return { income, expenses, investments, balance }
  }, [transactions])

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) {
      return "text-green-600 dark:text-green-400"
    } else if (diff > 0) {
      return "text-green-600 dark:text-green-400"
    } else {
      return "text-red-600 dark:text-red-400"
    }
  }

  const getDifferenceBgColor = (diff: number) => {
    if (diff === 0) {
      return "bg-green-50 dark:bg-green-950/50"
    } else if (diff > 0) {
      return "bg-green-50 dark:bg-green-950/50"
    } else {
      return "bg-red-50 dark:bg-red-950/50"
    }
  }

  const getDifferenceLabel = (diff: number) => {
    if (diff === 0) {
      return "✓ Perfect Match"
    } else if (diff > 0) {
      return "Extra Money (Not Logged)"
    } else {
      return "Missing Money"
    }
  }

  const cards = [
    {
      title: "Total Income",
      value: stats.income,
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/50",
    },
    {
      title: "Total Expenses",
      value: stats.expenses,
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/50",
    },
    {
      title: "Investments",
      value: stats.investments,
      icon: PiggyBank,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      title: "Balance",
      value: stats.balance,
      icon: Wallet,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Main Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          const isBalanceCard = card.title === "Balance"
          return (
            <Card 
              key={card.title} 
              className={`backdrop-blur-sm bg-card/80 ${isBalanceCard ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
              onClick={() => {
                if (isBalanceCard) {
                  setShowBalanceOverview(!showBalanceOverview)
                }
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ₹{card.value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Balance Overview Section - Only show when Balance card is clicked */}
      {showBalanceOverview && !isLoadingBalance && balanceError && (
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  ⚠️ Balance System Setup Required
                </p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                  {balanceError}
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-2 rounded font-mono">
                  Run this in Supabase SQL Editor:<br/>
                  scripts/create-balances-table.sql
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Balance Overview Section - Main Content */}
      {showBalanceOverview && !isLoadingBalance && !balanceError && balanceData && (
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Balance Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Comparing expected vs real balances
              </p>
            </div>
            <EditBalanceDialog
              initialCashBalance={balanceData.cash_balance}
              initialAccountBalance={balanceData.account_balance}
              onBalanceUpdated={fetchBalanceData}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance Comparison */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Required Balance */}
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Required Balance (Expected)
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{stats.balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = Income - Expenses - Investments
                </p>
              </div>

              {/* Real Balance */}
              <div className="bg-purple-50 dark:bg-purple-950/50 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Available Balance (Real)
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{balanceData.real_balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = GPay + Cash
                </p>
              </div>

              {/* Difference */}
              <div className={`${getDifferenceBgColor(balanceData.real_balance - stats.balance)} rounded-lg p-4 border ${balanceData.real_balance - stats.balance === 0 ? 'border-green-200 dark:border-green-800' : balanceData.real_balance - stats.balance > 0 ? 'border-green-200 dark:border-green-800' : 'border-red-200 dark:border-red-800'}`}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  {balanceData.real_balance - stats.balance === 0 ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  Difference / Mismatch
                </p>
                <p className={`text-3xl font-bold ${getDifferenceColor(balanceData.real_balance - stats.balance)}`}>
                  ₹{Math.abs(balanceData.real_balance - stats.balance).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className={`text-xs mt-2 font-medium ${getDifferenceColor(balanceData.real_balance - stats.balance)}`}>
                  {getDifferenceLabel(balanceData.real_balance - stats.balance)}
                </p>
              </div>
            </div>

            {/* Individual Balances */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Real Balance Breakdown
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="text-lg">💳</span>
                    GPay Account Balance
                  </span>
                  <span className="font-semibold">
                    ₹{balanceData.account_balance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <span className="text-lg">💵</span>
                    Cash in Hand
                  </span>
                  <span className="font-semibold">
                    ₹{balanceData.cash_balance.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Interpretation Help */}
            {balanceData.difference !== 0 && (
              <div className={`${balanceData.difference > 0 ? 'bg-green-50 dark:bg-green-950/50 border-l-4 border-l-green-500' : 'bg-red-50 dark:bg-red-950/50 border-l-4 border-l-red-500'} rounded p-3`}>
                <p className={`text-sm font-medium ${balanceData.difference > 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  💡 {balanceData.difference > 0 
                    ? "You have extra money that might not be logged as income or expense. Check if you missed recording any transactions."
                    : "You're missing money compared to your records. You might have forgotten to log some expenses or income."}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
