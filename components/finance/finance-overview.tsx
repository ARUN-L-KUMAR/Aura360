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
        // Transform wallet balance array to expected format
        const balances = result.data
        const cashBalance = balances.find((b: any) => b.paymentMethod === "cash")?.currentBalance || "0"
        const accountBalance = balances.find((b: any) => b.paymentMethod === "upi")?.currentBalance || "0"
        const cardBalance = balances.find((b: any) => b.paymentMethod === "card")?.currentBalance || "0"
        const bankBalance = balances.find((b: any) => b.paymentMethod === "bank_transfer")?.currentBalance || "0"
        
        const realBalance = parseFloat(cashBalance) + parseFloat(accountBalance) + parseFloat(cardBalance) + parseFloat(bankBalance)
        
        setBalanceData({
          id: null,
          cash_balance: parseFloat(cashBalance),
          account_balance: parseFloat(accountBalance) + parseFloat(cardBalance) + parseFloat(bankBalance),
          real_balance: realBalance,
          expected_balance: 0,
          difference: 0,
          updated_at: new Date().toISOString(),
        })
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

    // Y = Income - Expense (the net flow)
    const netFlow = income - expenses
    const balance = income - expenses - investments

    return { income, expenses, investments, balance, netFlow }
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
              {/* Net Flow (Y) */}
              <div className="bg-blue-50 dark:bg-blue-950/50 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Net Flow (Y)
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ₹{stats.netFlow.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = Income - Expense
                </p>
              </div>

              {/* Available Balance */}
              <div className="bg-purple-50 dark:bg-purple-950/50 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Available Balance
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  ₹{balanceData.real_balance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = GPay + Cash (Manual Entry)
                </p>
              </div>

              {/* Required Balance */}
              <div className="bg-orange-50 dark:bg-orange-950/50 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Required Balance
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  ₹{(balanceData.real_balance - stats.netFlow).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  = Available Balance - Net Flow
                </p>
              </div>
            </div>

            {/* Individual Balances */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                Available Balance Breakdown
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
          </CardContent>
        </Card>
      )}
    </div>
  )
}
