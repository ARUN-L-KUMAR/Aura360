"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Pencil, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  ChevronRight,
  MoreVertical,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  Wallet
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

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

interface MobileTransactionCardProps {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="h-3 w-3" />,
  upi: <Smartphone className="h-3 w-3" />,
  credit_card: <CreditCard className="h-3 w-3" />,
  debit_card: <CreditCard className="h-3 w-3" />,
  bank_transfer: <Building2 className="h-3 w-3" />,
  wallet: <Wallet className="h-3 w-3" />,
}

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

export function MobileTransactionCard({ transaction, onEdit, onDelete }: MobileTransactionCardProps) {
  const [showActions, setShowActions] = useState(false)

  const getTypeStyles = () => {
    switch (transaction.type) {
      case "income":
        return {
          icon: <TrendingUp className="h-4 w-4" />,
          bgColor: "bg-green-100 dark:bg-green-900/30",
          iconColor: "text-green-600 dark:text-green-400",
          amountColor: "text-green-600 dark:text-green-400",
          borderColor: "border-l-green-500",
          prefix: "+",
        }
      case "expense":
        return {
          icon: <TrendingDown className="h-4 w-4" />,
          bgColor: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-600 dark:text-red-400",
          amountColor: "text-red-600 dark:text-red-400",
          borderColor: "border-l-red-500",
          prefix: "-",
        }
      case "investment":
        return {
          icon: <PiggyBank className="h-4 w-4" />,
          bgColor: "bg-purple-100 dark:bg-purple-900/30",
          iconColor: "text-purple-600 dark:text-purple-400",
          amountColor: "text-purple-600 dark:text-purple-400",
          borderColor: "border-l-purple-500",
          prefix: "",
        }
    }
  }

  const styles = getTypeStyles()

  return (
    <Card 
      className={cn(
        "overflow-hidden transition-all duration-200 border-l-4",
        styles.borderColor,
        "active:scale-[0.98] touch-manipulation"
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-center gap-3 p-4">
          {/* Type Icon */}
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", styles.bgColor)}>
            <span className={styles.iconColor}>{styles.icon}</span>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-medium text-sm truncate">{transaction.category}</h4>
              <span className={cn("font-bold text-base whitespace-nowrap", styles.amountColor)}>
                {styles.prefix}₹{transaction.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-2 mt-1">
              <p className="text-xs text-muted-foreground truncate">
                {transaction.description || "No description"}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                {transaction.payment_method && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {paymentMethodIcons[transaction.payment_method]}
                    {formatPaymentMethod(transaction.payment_method)}
                  </span>
                )}
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(transaction)} className="gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(transaction.id)} 
                    className="gap-2 text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton for loading state
export function MobileTransactionCardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-muted">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-6 w-6 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
