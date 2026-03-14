"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, TrendingUp, TrendingDown, PiggyBank, Wallet } from "lucide-react"
import { useState } from "react"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import type { Transaction } from "@/lib/types/finance"

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

    try {
      const response = await fetch(`/api/finance/transactions/${transaction.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Failed to delete transaction")
      }

      onDelete(transaction.id)
    } catch (error: any) {
      console.error("[v0] Error deleting transaction:", error)
      alert(error.message || "Failed to delete transaction")
    } finally {
      setIsDeleting(false)
    }
  }

  const typeConfig = {
    income: {
      icon: TrendingUp,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    expense: {
      icon: TrendingDown,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    investment: {
      icon: PiggyBank,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    transfer: {
      icon: Wallet,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
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
            <p className="text-sm text-muted-foreground truncate">
              {transaction.description || "(No description)"}
            </p>
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
          <p className="text-lg font-bold">
            {transaction.type === "income" ? "+" : "-"}₹
            {Number(transaction.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
