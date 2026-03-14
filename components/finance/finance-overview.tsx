"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Wallet, PiggyBank, AlertCircle, CheckCircle2 } from "lucide-react"
import { useMemo, useState, useEffect } from "react"
import { EditBalanceDialog } from "./edit-balance-dialog"
import { toast } from "sonner"
import type { Transaction, BalanceData } from "@/lib/types/finance"

interface FinanceOverviewProps {
  transactions: Transaction[]
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
          workspaceId: "",
          userId: "",
          cashBalance: parseFloat(cashBalance),
          accountBalance: parseFloat(accountBalance) + parseFloat(cardBalance) + parseFloat(bankBalance),
          realBalance: realBalance,
          expectedBalance: 0,
          difference: 0,
          updatedAt: new Date().toISOString(),
        })
      } else {
        // Initialize with default zero balances
        setBalanceData({
          id: null,
          workspaceId: "",
          userId: "",
          cashBalance: 0,
          accountBalance: 0,
          realBalance: 0,
          expectedBalance: 0,
          difference: 0,
          updatedAt: null,
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
      .filter((t: Transaction) => t.type === "income")
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

    const expenses = transactions
      .filter((t: Transaction) => t.type === "expense")
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

    const investments = transactions
      .filter((t: Transaction) => t.type === "investment")
      .reduce((sum: number, t: Transaction) => sum + Number(t.amount), 0)

    // Y = Income - Expense (the net flow)
    const netFlow = income - expenses
    const balance = income - expenses - investments

    return { income, expenses, investments, balance, netFlow }
  }, [transactions])

  const getDifferenceColor = (diff: number) => {
    if (diff === 0) {
      return "text-slate-600 dark:text-slate-400"
    } else if (diff > 0) {
      return "text-slate-900 dark:text-slate-100"
    } else {
      return "text-slate-900 dark:text-slate-100"
    }
  }

  const getDifferenceBgColor = (diff: number) => {
    return "bg-secondary/50"
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
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
    },
    {
      title: "Total Expenses",
      value: stats.expenses,
      icon: TrendingDown,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
    },
    {
      title: "Investments",
      value: stats.investments,
      icon: PiggyBank,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
    },
    {
      title: "Balance",
      value: stats.balance,
      icon: Wallet,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
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
              initialCashBalance={balanceData.cashBalance}
              initialAccountBalance={balanceData.accountBalance}
              onBalanceUpdated={fetchBalanceData}
            />
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Balance Comparison */}
            <div className="grid md:grid-cols-3 gap-4">
              {/* Net Flow (Y) */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Net Flow (Y)
                </p>
                <p className="text-3xl font-bold">
                  ₹{stats.netFlow.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  = Income - Expense
                </p>
              </div>

              {/* Available Balance */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Available Balance
                </p>
                <p className="text-3xl font-bold">
                  ₹{balanceData.realBalance.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  = GPay + Cash
                </p>
              </div>

              {/* Required Balance */}
              <div className="bg-secondary/30 rounded-lg p-4 border border-border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                  Required Balance
                </p>
                <p className="text-3xl font-bold">
                  ₹{(balanceData.realBalance - stats.netFlow).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-2 font-medium">
                  = Available - Net Flow
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
                    ₹{balanceData.accountBalance.toLocaleString("en-IN", {
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
                    ₹{balanceData.cashBalance.toLocaleString("en-IN", {
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
