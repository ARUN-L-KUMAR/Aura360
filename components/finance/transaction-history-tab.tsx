"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Pencil, Trash2, TrendingUp, TrendingDown, PiggyBank, Download, Plus, Filter, X, Wallet, AlertCircle, CheckCircle2, Table, FileSpreadsheet, CreditCard, Banknote, Smartphone, Building2, ChevronDown, SlidersHorizontal } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { AddTransactionDialog } from "./add-transaction-dialog"
import { EditBalanceDialog } from "./edit-balance-dialog"
import { MultiSheetUploadDialog } from "./multi-sheet-upload-dialog"
import { IncomeEntryTable } from "./income-entry-table"
import { ExpenseEntryTable } from "./expense-entry-table"
import { InvestmentEntryTable } from "./investment-entry-table"
import { MobileTransactionCard } from "./mobile-transaction-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

interface Transaction {
  id: string
  user_id: string
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  description: string | null
  payment_method: string | null
  date: string
  created_at: string
  updated_at: string
}

interface TransactionHistoryTabProps {
  initialTransactions: Transaction[]
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

type TransactionType = "income" | "expense" | "investment"

// Helper function to format payment method for display
function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
    wallet: "Wallet",
    other: "Other",
  }
  return methodMap[method] || method
}

function TransactionTable({
  type,
  transactions,
  onDelete,
  onEdit,
  searchQuery,
  monthFilter,
  categoryFilter,
  isMobile,
}: {
  type: TransactionType
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (transaction: Transaction) => void
  searchQuery: string
  monthFilter: string
  categoryFilter: string
  isMobile: boolean
}) {
  const filteredTransactions = transactions
    .filter((t) => t.type === type)
    .filter((t) => {
      const desc = (t.description || "").toLowerCase()
      const matchesSearch =
        searchQuery === "" ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.includes(searchQuery.toLowerCase())

      const transactionDate = new Date(t.date)
      const matchesMonth =
        monthFilter === "all" ||
        `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, "0")}` === monthFilter

      const matchesCategory = categoryFilter === "all" || t.category === categoryFilter

      return matchesSearch && matchesMonth && matchesCategory
    })

  const getAmountColor = () => {
    switch (type) {
      case "income":
        return "text-green-600 dark:text-green-400"
      case "expense":
        return "text-red-600 dark:text-red-400"
      case "investment":
        return "text-purple-600 dark:text-purple-400"
    }
  }

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  if (filteredTransactions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <p className="text-muted-foreground text-sm">
          {searchQuery || monthFilter !== "all" || categoryFilter !== "all"
            ? "No transactions found matching your filters."
            : `No ${type} transactions yet.`}
        </p>
      </div>
    )
  }

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 text-xs">
          <span className="text-muted-foreground">
            {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
          </span>
          <span>
            <span className="text-muted-foreground">Total: </span>
            <span className={cn("font-semibold", getAmountColor())}>
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </span>
        </div>

        {/* Transaction Cards */}
        <div className="space-y-2">
          {filteredTransactions.map((transaction) => (
            <MobileTransactionCard
              key={transaction.id}
              transaction={transaction}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    )
  }

  // Desktop Table View
  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-muted/50">
        <span className="text-sm text-muted-foreground">
          Showing {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? "s" : ""}
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Total: </span>
          <span className={cn("font-semibold", getAmountColor())}>
            ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground">
                      {new Date(transaction.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium">{transaction.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-muted-foreground truncate max-w-xs block">
                      {transaction.description || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className={cn("font-semibold", getAmountColor())}>
                        {type === "expense" ? "-" : "+"}₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                      {transaction.payment_method && (
                        <span className="text-xs text-muted-foreground">
                          ({formatPaymentMethod(transaction.payment_method)})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(transaction.id)}
                        className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export function TransactionHistoryTab({ initialTransactions }: TransactionHistoryTabProps) {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isBulkMode, setIsBulkMode] = useState(false)
  const [activeTab, setActiveTab] = useState<TransactionType>("expense")
  const [showFilters, setShowFilters] = useState(false)
  
  // Balance Overview state
  const [showBalanceOverview, setShowBalanceOverview] = useState(false)
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [isLoadingBalance, setIsLoadingBalance] = useState(true)
  const [balanceError, setBalanceError] = useState<string | null>(null)

  // Fetch balance data
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

  // Fetch transactions from database
  const fetchTransactions = async (showToast = false) => {
    try {
      const response = await fetch("/api/finance/transactions")
      const result = await response.json()
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to fetch transactions")
      }
      
      if (result.data) {
        setTransactions(result.data)
        if (showToast) {
          toast({
            title: "Data Refreshed",
            description: `Loaded ${result.data.length} transactions`,
          })
        }
      }
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error",
        description: "Failed to refresh transactions",
        variant: "destructive",
      })
    }
  }

  // Callback for bulk entry tables
  const handleBulkEntrySaved = () => {
    fetchTransactions(false) // Refresh without toast since entry tables show their own toast
  }

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [monthFilter, setMonthFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Get unique months from transactions
  const availableMonths = useMemo(() => {
    const months = new Set<string>()
    transactions.forEach((t) => {
      const date = new Date(t.date)
      months.add(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`)
    })
    return Array.from(months).sort().reverse()
  }, [transactions])

  // Get unique categories for current type
  const availableCategories = useMemo(() => {
    const categories = new Set<string>()
    transactions
      .filter((t) => t.type === activeTab)
      .forEach((t) => categories.add(t.category))
    return Array.from(categories).sort()
  }, [transactions, activeTab])

  const handleDelete = async (transactionId: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return

    try {
      const response = await fetch(`/api/finance/transactions/${transactionId}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete transaction")
      }

      setTransactions((prev) => prev.filter((t) => t.id !== transactionId))
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      })
    }
  }

  const handleTransactionUpdated = (updatedTransaction: Transaction) => {
    setTransactions((prev) => prev.map((t) => (t.id === updatedTransaction.id ? updatedTransaction : t)))
    setEditingTransaction(null)
  }

  const handleTransactionAdded = (newTransaction: Transaction) => {
    setTransactions((prev) => [newTransaction, ...prev])
    setShowAddDialog(false)
  }

  const exportToCSV = () => {
    const filteredData = transactions.filter((t) => t.type === activeTab)
    if (filteredData.length === 0) {
      toast({
        title: "No Data",
        description: "No transactions to export",
        variant: "destructive",
      })
      return
    }

    const headers = ["Date", "Category", "Description", "Amount", "Type"]
    const rows = filteredData.map((t) => [
      new Date(t.date).toLocaleDateString("en-IN"),
      t.category,
      t.description || "",
      t.amount.toString(),
      t.type,
    ])

    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${activeTab}_transactions_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)

    toast({
      title: "Export Successful",
      description: `${filteredData.length} ${activeTab} transactions exported to CSV`,
    })
  }

  const clearFilters = () => {
    setSearchQuery("")
    setMonthFilter("all")
    setCategoryFilter("all")
  }

  const hasActiveFilters = searchQuery !== "" || monthFilter !== "all" || categoryFilter !== "all"

  const incomeCount = transactions.filter((t) => t.type === "income").length
  const expenseCount = transactions.filter((t) => t.type === "expense").length
  const investmentCount = transactions.filter((t) => t.type === "investment").length

  // Calculate stats for the summary cards
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
    // Balance is still calculated for display purposes
    const balance = income - expenses - investments

    return { income, expenses, investments, balance, netFlow }
  }, [transactions])

  return (
    <>
      {/* Quick Stats Cards */}
      <div className={cn(
        "grid gap-3 mb-4",
        isMobile ? "grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      )}>
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-3 px-3" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-[10px]" : "text-sm"
            )}>Total Income</CardTitle>
            <div className={cn(
              "rounded-lg bg-green-50 dark:bg-green-950/50 flex items-center justify-center",
              isMobile ? "w-6 h-6" : "w-8 h-8"
            )}>
              <TrendingUp className={cn(
                "text-green-600 dark:text-green-400",
                isMobile ? "w-3 h-3" : "w-4 h-4"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-3 px-3" : ""}>
            <div className={cn(
              "font-bold text-green-600 dark:text-green-400",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              ₹{stats.income.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-3 px-3" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-[10px]" : "text-sm"
            )}>Total Expenses</CardTitle>
            <div className={cn(
              "rounded-lg bg-red-50 dark:bg-red-950/50 flex items-center justify-center",
              isMobile ? "w-6 h-6" : "w-8 h-8"
            )}>
              <TrendingDown className={cn(
                "text-red-600 dark:text-red-400",
                isMobile ? "w-3 h-3" : "w-4 h-4"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-3 px-3" : ""}>
            <div className={cn(
              "font-bold text-red-600 dark:text-red-400",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              ₹{stats.expenses.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-3 px-3" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-[10px]" : "text-sm"
            )}>Investments</CardTitle>
            <div className={cn(
              "rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center",
              isMobile ? "w-6 h-6" : "w-8 h-8"
            )}>
              <PiggyBank className={cn(
                "text-purple-600 dark:text-purple-400",
                isMobile ? "w-3 h-3" : "w-4 h-4"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-3 px-3" : ""}>
            <div className={cn(
              "font-bold text-purple-600 dark:text-purple-400",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              ₹{stats.investments.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </div>
          </CardContent>
        </Card>

        <Card 
          className="backdrop-blur-sm bg-card/80 cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => setShowBalanceOverview(!showBalanceOverview)}
        >
          <CardHeader className={cn(
            "flex flex-row items-center justify-between",
            isMobile ? "pb-1 pt-3 px-3" : "pb-2"
          )}>
            <CardTitle className={cn(
              "font-medium text-muted-foreground",
              isMobile ? "text-[10px]" : "text-sm"
            )}>Balance</CardTitle>
            <div className={cn(
              "rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center",
              isMobile ? "w-6 h-6" : "w-8 h-8"
            )}>
              <Wallet className={cn(
                "text-blue-600 dark:text-blue-400",
                isMobile ? "w-3 h-3" : "w-4 h-4"
              )} />
            </div>
          </CardHeader>
          <CardContent className={isMobile ? "pb-3 px-3" : ""}>
            <div className={cn(
              "font-bold text-blue-600 dark:text-blue-400",
              isMobile ? "text-lg" : "text-2xl"
            )}>
              ₹{stats.balance.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </div>
            <p className={cn(
              "text-muted-foreground mt-0.5",
              isMobile ? "text-[9px]" : "text-xs"
            )}>Tap for details</p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Overview Section */}
      {showBalanceOverview && !isLoadingBalance && balanceError && (
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-yellow-500 mb-6">
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

      {showBalanceOverview && !isLoadingBalance && !balanceError && balanceData && (
        <Card className="backdrop-blur-sm bg-card/80 border-l-4 border-l-blue-500 mb-6">
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
              <div className="bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800 rounded-lg p-4 border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
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

      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader className={isMobile ? "px-4 py-4" : ""}>
          <div className={cn(
            "flex items-center justify-between",
            isMobile && "flex-col gap-3 items-start"
          )}>
            <div>
              <CardTitle className={isMobile ? "text-lg" : "text-xl"}>Transaction History</CardTitle>
              <p className={cn(
                "text-muted-foreground mt-1",
                isMobile ? "text-xs" : "text-sm"
              )}>
                View and manage all your transactions
              </p>
            </div>
            
            {/* Desktop Actions */}
            {!isMobile && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBulkMode(!isBulkMode)}
                  className="gap-2"
                >
                  <Table className="h-4 w-4" />
                  {isBulkMode ? "Hide Bulk Entry" : "Bulk Entry"}
                </Button>
                <MultiSheetUploadDialog />
                <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button size="sm" onClick={() => setShowAddDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Transaction
                </Button>
              </div>
            )}
            
            {/* Mobile Actions */}
            {isMobile && (
              <div className="flex items-center gap-2 w-full">
                <Button
                  size="sm"
                  onClick={() => setShowAddDialog(true)}
                  className="flex-1 gap-1 h-9"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportToCSV}
                  className="h-9 w-9 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <MultiSheetUploadDialog />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className={cn("space-y-4", isMobile ? "px-4 py-3" : "space-y-6")}>
          {/* Bulk Entry Mode - Desktop Only */}
          {!isMobile && isBulkMode && (
            <div className="bg-muted/30 rounded-lg border p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold">Bulk Entry Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Add multiple transactions quickly. Use TAB to navigate, paste from Excel, or add rows one by one.
                </p>
              </div>
              
              <Tabs defaultValue="expense" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="income" className="gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Income
                  </TabsTrigger>
                  <TabsTrigger value="expense" className="gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Expense
                  </TabsTrigger>
                  <TabsTrigger value="investment" className="gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Investment
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="income" className="mt-0">
                  <IncomeEntryTable onTransactionsSaved={handleBulkEntrySaved} />
                </TabsContent>
                
                <TabsContent value="expense" className="mt-0">
                  <ExpenseEntryTable onTransactionsSaved={handleBulkEntrySaved} />
                </TabsContent>
                
                <TabsContent value="investment" className="mt-0">
                  <InvestmentEntryTable onTransactionsSaved={handleBulkEntrySaved} />
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Filters Section */}
          {isMobile ? (
            // Mobile Filters - Collapsible
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
                <Button
                  variant={showFilters || hasActiveFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="h-9 w-9 p-0 shrink-0"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-9 w-9 p-0 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Collapsible Filters */}
              {showFilters && (
                <div className="flex gap-2">
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {availableMonths.map((month) => (
                        <SelectItem key={month} value={month}>
                          {new Date(month + "-01").toLocaleDateString("en-IN", {
                            month: "short",
                            year: "numeric",
                          })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="flex-1 h-9 text-xs">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            // Desktop Filters
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-lg bg-muted/30 border">
              <Filter className="h-4 w-4 text-muted-foreground" />

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              {/* Month Filter */}
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {availableMonths.map((month) => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Tabs */}
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className={cn(
                "text-muted-foreground mb-4",
                isMobile ? "text-sm" : ""
              )}>No transactions yet. Add your first transaction!</p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as TransactionType)
                setCategoryFilter("all") // Reset category when switching tabs
              }}
              className="w-full"
            >
              <TabsList className={cn(
                "grid w-full grid-cols-3",
                isMobile ? "mb-4" : "mb-6"
              )}>
                <TabsTrigger value="income" className={cn(
                  "gap-1",
                  isMobile ? "text-xs px-2" : "gap-2"
                )}>
                  <TrendingUp className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  {isMobile ? `Inc (${incomeCount})` : `Income (${incomeCount})`}
                </TabsTrigger>
                <TabsTrigger value="expense" className={cn(
                  "gap-1",
                  isMobile ? "text-xs px-2" : "gap-2"
                )}>
                  <TrendingDown className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  {isMobile ? `Exp (${expenseCount})` : `Expense (${expenseCount})`}
                </TabsTrigger>
                <TabsTrigger value="investment" className={cn(
                  "gap-1",
                  isMobile ? "text-xs px-2" : "gap-2"
                )}>
                  <PiggyBank className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                  {isMobile ? `Inv (${investmentCount})` : `Investment (${investmentCount})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="mt-0">
                <TransactionTable
                  type="income"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                  searchQuery={searchQuery}
                  monthFilter={monthFilter}
                  categoryFilter={categoryFilter}
                  isMobile={isMobile}
                />
              </TabsContent>

              <TabsContent value="expense" className="mt-0">
                <TransactionTable
                  type="expense"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                  searchQuery={searchQuery}
                  monthFilter={monthFilter}
                  categoryFilter={categoryFilter}
                  isMobile={isMobile}
                />
              </TabsContent>

              <TabsContent value="investment" className="mt-0">
                <TransactionTable
                  type="investment"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                  searchQuery={searchQuery}
                  monthFilter={monthFilter}
                  categoryFilter={categoryFilter}
                  isMobile={isMobile}
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {editingTransaction && (
        <EditTransactionDialog
          transaction={editingTransaction}
          open={!!editingTransaction}
          onOpenChange={(open) => !open && setEditingTransaction(null)}
          onUpdate={handleTransactionUpdated}
        />
      )}

      <AddTransactionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onTransactionAdded={handleTransactionAdded}
      />
    </>
  )
}
