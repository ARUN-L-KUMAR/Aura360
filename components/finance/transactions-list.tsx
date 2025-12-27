"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Pencil, Trash2, TrendingUp, TrendingDown, PiggyBank, Calendar, Tag } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

interface TransactionsListProps {
  initialTransactions: Transaction[]
}

type TransactionType = "income" | "expense" | "investment"

interface TypeTableProps {
  type: TransactionType
  transactions: Transaction[]
  onDelete: (id: string) => void
  onEdit: (transaction: Transaction) => void
}

function TypeTable({ type, transactions, onDelete, onEdit }: TypeTableProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTransactions = transactions
    .filter((t) => t.type === type)
    .filter((t) => {
      const desc = (t.description || "").toLowerCase()
      return (
        searchQuery === "" ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.includes(searchQuery.toLowerCase())
      )
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

  const getAmountBgColor = () => {
    switch (type) {
      case "income":
        return "bg-green-100 dark:bg-green-900/30"
      case "expense":
        return "bg-red-100 dark:bg-red-900/30"
      case "investment":
        return "bg-purple-100 dark:bg-purple-900/30"
    }
  }

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-4">
      {/* Search and Stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className={`px-4 py-2 rounded-lg ${getAmountBgColor()} text-center sm:text-left`}>
          <p className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className={`font-semibold ${getAmountColor()}`}>
              ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </p>
        </div>
      </div>

      {/* Transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No transactions found matching your search."
              : `No ${type} transactions yet.`}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-lg font-semibold ${getAmountColor()}`}>
                        {type === "expense" ? "-" : "+"}₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Tag className="w-3 h-3" />
                      <span className="font-medium text-foreground">{transaction.category}</span>
                    </div>
                    {transaction.description && (
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {transaction.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(transaction.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
                      className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Action</th>
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
                        <span className="text-sm">{transaction.category}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground truncate max-w-xs block">
                          {transaction.description || "(No description)"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${getAmountColor()}`}>
                          {type === "expense" ? "-" : "+"}₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
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
                            className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
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
        </>
      )}
    </div>
  )
}

export function TransactionsList({ initialTransactions }: TransactionsListProps) {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

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

  const incomeCount = transactions.filter(t => t.type === "income").length
  const expenseCount = transactions.filter(t => t.type === "expense").length
  const investmentCount = transactions.filter(t => t.type === "investment").length

  return (
    <>
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl">Transaction History</CardTitle>
          <p className="text-sm text-muted-foreground">
            View all your transactions organized by type
          </p>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No transactions yet. Add your first transaction!
              </p>
            </div>
          ) : (
            <Tabs defaultValue="expense" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-auto">
                <TabsTrigger value="income" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Income</span>
                  <span className="xs:hidden">In</span>
                  <span className="text-muted-foreground">({incomeCount})</span>
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
                  <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Expense</span>
                  <span className="xs:hidden">Exp</span>
                  <span className="text-muted-foreground">({expenseCount})</span>
                </TabsTrigger>
                <TabsTrigger value="investment" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 px-1 sm:px-3">
                  <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden xs:inline">Investment</span>
                  <span className="xs:hidden">Inv</span>
                  <span className="text-muted-foreground">({investmentCount})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="income" className="mt-0">
                <TypeTable
                  type="income"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                />
              </TabsContent>

              <TabsContent value="expense" className="mt-0">
                <TypeTable
                  type="expense"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
                />
              </TabsContent>

              <TabsContent value="investment" className="mt-0">
                <TypeTable
                  type="investment"
                  transactions={transactions}
                  onDelete={handleDelete}
                  onEdit={setEditingTransaction}
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
    </>
  )
}
