import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FinanceOverview } from "@/components/finance/finance-overview"
import { TransactionsList } from "@/components/finance/transactions-list"
import { AddTransactionButton } from "@/components/finance/add-transaction-button"
import { DollarSign } from "lucide-react"

export default async function FinancePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: transactions } = await supabase
    .from("finances")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Finance</h1>
              <p className="text-muted-foreground">Track your income and expenses</p>
            </div>
          </div>
          <AddTransactionButton />
        </div>

        <div className="space-y-6">
          <FinanceOverview transactions={transactions || []} />
          <TransactionsList initialTransactions={transactions || []} />
        </div>
      </div>
    </div>
  )
}
