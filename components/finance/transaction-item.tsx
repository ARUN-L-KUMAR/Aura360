"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, TrendingUp, TrendingDown, PiggyBank } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditTransactionDialog } from "./edit-transaction-dialog"

interface Transaction {
  id: string
  user_id: string
  type: "income" | "expense" | "investment"
  amount: number
  category: string
  description: string | null
  date: string
  created_at: string
  updated_at: string
}

interface TransactionItemProps {
  transaction: Transaction
  onDelete: (transactionId: string) => void
  onUpdate: (transaction: Transaction) => void
}

export function TransactionItem({ transaction, onDelete, onUpdate }: TransactionItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this transaction?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("finances").delete().eq("id", transaction.id)

    if (error) {
      console.error("[v0] Error deleting transaction:", error)
      alert("Failed to delete transaction")
    } else {
      onDelete(transaction.id)
    }
    setIsDeleting(false)
  }

  const typeConfig = {
    income: {
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/50",
      badge: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    },
    expense: {
      icon: TrendingDown,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/50",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
    },
    investment: {
      icon: PiggyBank,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    },
  }

  const config = typeConfig[transaction.type]
  const Icon = config.icon

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{transaction.category}</p>
              <Badge className={`${config.badge} border-0`}>{transaction.type}</Badge>
            </div>
            {transaction.description && (
              <p className="text-sm text-muted-foreground truncate">{transaction.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(transaction.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <p className={`text-lg font-bold ${config.color}`}>
            {transaction.type === "income" ? "+" : "-"}$
            {Number(transaction.amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEditDialog(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <EditTransactionDialog
        transaction={transaction}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onUpdate={onUpdate}
      />
    </>
  )
}
