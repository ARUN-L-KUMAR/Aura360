"use client"

import { useState, useEffect } from "react"
import { FinanceOverviewTab } from "@/components/finance/finance-overview-tab"
import { TransactionHistoryTab } from "@/components/finance/transaction-history-tab"
import { ReportsTab } from "@/components/finance/reports-tab"
import { ShareTransactionModal } from "@/components/finance/share-transaction-modal"
import { DollarSign, LayoutDashboard, History, BarChart3, ArrowUp, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

interface BalanceData {
  cash_balance: number
  account_balance: number
}

export default function FinancePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeMainTab, setActiveMainTab] = useState("overview")
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // Handle scroll to show/hide Go to Top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Fetch all transactions with pagination (Supabase limit is 1000 per request)
      let allTransactions: Transaction[] = []
      let offset = 0
      const pageSize = 1000
      let hasMore = true

      while (hasMore) {
        const { data, error } = await supabase
          .from("finances")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .range(offset, offset + pageSize - 1)

        if (error) {
          console.error('❌ [PAGE] Error fetching transactions:', error)
          break
        }

        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allTransactions = [...allTransactions, ...data]
          offset += pageSize
        }
      }

      setTransactions(allTransactions)
      
      // Fetch balance data
      try {
        const balanceResponse = await fetch("/api/finance/balances")
        if (balanceResponse.ok) {
          const balanceResult = await balanceResponse.json()
          if (balanceResult.data) {
            setBalanceData({
              cash_balance: balanceResult.data.cash_balance,
              account_balance: balanceResult.data.account_balance,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching balance data:", error)
      }
      
      setIsLoading(false)
    }

    loadData()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-gray-950 dark:via-slate-950 dark:to-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground">Loading finances...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-gray-950 dark:via-slate-950 dark:to-zinc-950 transition-colors duration-300">
      <div className={cn(
        "mx-auto max-w-7xl",
        isMobile ? "p-4 pb-24" : "p-6 md:p-10"
      )}>
        {/* Header */}
        <div className={cn(
          "mb-6 flex items-center justify-between",
          isMobile && "flex-col gap-4 items-start"
        )}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center",
              isMobile ? "w-10 h-10" : "w-12 h-12"
            )}>
              <DollarSign className={cn(
                "text-blue-600 dark:text-blue-400",
                isMobile ? "w-5 h-5" : "w-6 h-6"
              )} />
            </div>
            <div>
              <h1 className={cn(
                "font-bold tracking-tight text-foreground",
                isMobile ? "text-2xl" : "text-4xl"
              )}>Finance</h1>
              <p className={cn(
                "text-muted-foreground",
                isMobile ? "text-xs" : "text-sm"
              )}>Track your income and expenses</p>
            </div>
          </div>
          
          {/* Theme Toggle & Share Button */}
          <div className={cn(
            "flex items-center gap-2",
            isMobile && "self-end -mt-12"
          )}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size={isMobile ? "sm" : "default"}
                    onClick={() => setShowShareModal(true)}
                    className="gap-2"
                  >
                    <Share2 className={cn(isMobile ? "h-4 w-4" : "h-4 w-4")} />
                    {!isMobile && "Add from GPay"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add expense from shared UPI transaction</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <ThemeToggle />
          </div>
        </div>

        {/* Main Tabs - Mobile Optimized */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          {/* Desktop Tabs */}
          {!isMobile && (
            <TabsList className="grid w-full grid-cols-3 mb-6 h-12">
              <TabsTrigger value="overview" className="gap-2 text-sm">
                <LayoutDashboard className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="transactions" className="gap-2 text-sm">
                <History className="h-4 w-4" />
                Transaction History
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2 text-sm">
                <BarChart3 className="h-4 w-4" />
                Reports
              </TabsTrigger>
            </TabsList>
          )}

          {/* Mobile Bottom Navigation Tabs */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t shadow-lg safe-area-bottom">
              <TabsList className="grid w-full grid-cols-3 h-16 bg-transparent rounded-none">
                <TabsTrigger 
                  value="overview" 
                  className="flex-col gap-1 h-full rounded-none data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/50 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  <span className="text-xs">Overview</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="transactions" 
                  className="flex-col gap-1 h-full rounded-none data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/50 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <History className="h-5 w-5" />
                  <span className="text-xs">History</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="flex-col gap-1 h-full rounded-none data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/50 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                >
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs">Reports</span>
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-0">
            <FinanceOverviewTab transactions={transactions} />
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="mt-0">
            <TransactionHistoryTab initialTransactions={transactions} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0">
            <ReportsTab transactions={transactions} balanceData={balanceData} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Go to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className={cn(
            "fixed z-50 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white",
            isMobile ? "bottom-20 right-4 h-10 w-10" : "bottom-6 right-6 h-12 w-12"
          )}
          size="icon"
        >
          <ArrowUp className={cn(isMobile ? "h-4 w-4" : "h-5 w-5")} />
        </Button>
      )}

      {/* Share Transaction Modal */}
      <ShareTransactionModal
        open={showShareModal}
        onOpenChange={setShowShareModal}
        onSuccess={() => {
          // Reload the page to get fresh data
          window.location.reload()
        }}
      />
    </div>
  )
}
