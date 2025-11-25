"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Pencil, Trash2, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
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
        return "text-green-600"
      case "expense":
        return "text-red-600"
      case "investment":
        return "text-purple-600"
    }
  }

  const totalAmount = filteredTransactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="space-y-4">
      {/* Search and Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="px-4 py-2 rounded-lg bg-muted">
          <p className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className={`font-semibold ${getAmountColor()}`}>
              ₹{totalAmount.toFixed(2)}
            </span>
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      {filteredTransactions.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <p className="text-muted-foreground">
            {searchQuery
              ? "No transactions found matching your search."
              : `No ${type} transactions yet.`}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
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
                        {type === "expense" ? "-" : "+"}₹{transaction.amount.toFixed(2)}
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
                          className="h-8 w-8 p-0 hover:text-red-600 hover:bg-red-50"
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
      const supabase = createClient()
      const { error } = await supabase.from("finances").delete().eq("id", transactionId)

      if (error) throw error

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
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            View all your transactions organized by type
          </p>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No transactions yet. Add your first transaction!
              </p>
            </div>
          ) : (
            <Tabs defaultValue="expense" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="income" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Income ({incomeCount})
                </TabsTrigger>
                <TabsTrigger value="expense" className="gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Expense ({expenseCount})
                </TabsTrigger>
                <TabsTrigger value="investment" className="gap-2">
                  <PiggyBank className="h-4 w-4" />
                  Investment ({investmentCount})
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
