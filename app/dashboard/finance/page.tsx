"use client"

import { useState, useEffect } from "react"
import { FinanceOverviewTab } from "@/components/finance/finance-overview-tab"
import { TransactionHistoryTab } from "@/components/finance/transaction-history-tab"
import { ReportsTab } from "@/components/finance/reports-tab"
import { ShareTransactionModal } from "@/components/finance/share-transaction-modal"
import { DollarSign, LayoutDashboard, History, BarChart3, ArrowUp, Share2, ArrowLeft, Home, LayoutGrid, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Transaction {
  id: string
  userId: string
  workspaceId: string
  type: "income" | "expense" | "investment" | "transfer"
  amount: string
  category: string
  description: string
  date: string
  paymentMethod: string | null
  notes: string | null
  needsReview: boolean
  createdAt: string
  updatedAt: string
}

interface BalanceData {
  cash: number
  card: number
  upi: number
  bank_transfer: number
}

// Helper to transform transaction format for components
const transformTransactions = (transactions: Transaction[]) => {
  return transactions
    .filter(t => t.type !== "transfer") // Filter out transfer type as components don't support it
    .map(t => ({
      id: t.id,
      user_id: t.userId,
      type: t.type as "income" | "expense" | "investment",
      amount: parseFloat(t.amount),
      category: t.category,
      description: t.description,
      date: t.date,
      payment_method: t.paymentMethod,
      needs_review: t.needsReview,
      created_at: t.createdAt,
      updated_at: t.updatedAt,
    }))
}

export default function FinancePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
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
    if (status === "unauthenticated") {
      router.push("/auth/login")
      return
    }

    if (status === "loading") {
      return
    }

    async function loadData() {
      try {
        // Fetch all transactions from new API
        const response = await fetch("/api/finance/transactions?limit=10000")
        
        if (!response.ok) {
          throw new Error("Failed to fetch transactions")
        }

        const result = await response.json()
        
        if (result.success) {
          setTransactions(result.data || [])
        }
        
        // Fetch balance data from wallet balances API
        try {
          const balanceResponse = await fetch("/api/finance/balances")
          if (balanceResponse.ok) {
            const balanceResult = await balanceResponse.json()
            if (balanceResult.success && balanceResult.data) {
              // Convert wallet balances to old format for compatibility
              const balances = balanceResult.data
              setBalanceData({
                cash: balances.find((b: any) => b.paymentMethod === "cash")?.balance || 0,
                card: balances.find((b: any) => b.paymentMethod === "card")?.balance || 0,
                upi: balances.find((b: any) => b.paymentMethod === "upi")?.balance || 0,
                bank_transfer: balances.find((b: any) => b.paymentMethod === "bank_transfer")?.balance || 0,
              })
            }
          }
        } catch (error) {
          console.error("Error fetching balance data:", error)
        }
      } catch (error) {
        console.error("Error loading finance data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, status])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      // Clear existing data first
      setTransactions([])
      setBalanceData(null)
      
      // Fetch fresh data with cache-busting
      const timestamp = new Date().getTime()
      
      // Fetch all transactions from new API
      const response = await fetch(`/api/finance/transactions?limit=10000&_=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      const result = await response.json()
      
      if (result.success) {
        setTransactions(result.data || [])
      }
      
      // Fetch balance data from wallet balances API
      const balanceResponse = await fetch(`/api/finance/balances?_=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (balanceResponse.ok) {
        const balanceResult = await balanceResponse.json()
        if (balanceResult.success && balanceResult.data) {
          // Convert wallet balances to old format for compatibility
          const balances = balanceResult.data
          setBalanceData({
            cash: balances.find((b: any) => b.paymentMethod === "cash")?.balance || 0,
            card: balances.find((b: any) => b.paymentMethod === "card")?.balance || 0,
            upi: balances.find((b: any) => b.paymentMethod === "upi")?.balance || 0,
            bank_transfer: balances.find((b: any) => b.paymentMethod === "bank_transfer")?.balance || 0,
          })
        }
      }
    } catch (error) {
      console.error("Error refreshing finance data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

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
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-lg border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-14 items-center justify-between gap-4">
            {/* Left Section - Back & Logo */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              
              <div className="hidden sm:block h-6 w-px bg-border" />
              
              <Link href="/" className="hidden sm:flex items-center gap-2 font-semibold text-foreground hover:text-primary transition-colors">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white text-sm font-bold">A</span>
                </div>
                <span>Aura360</span>
              </Link>
            </div>

            {/* Right Section - Navigation & Actions */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/">
                    <Home className="h-4 w-4 mr-1.5" />
                    Home
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">
                    <LayoutGrid className="h-4 w-4 mr-1.5" />
                    Dashboard
                  </Link>
                </Button>
              </div>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareModal(true)}
                      className="gap-2"
                    >
                      <Share2 className="h-4 w-4" />
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
        </div>
      </div>

      <div className={cn(
        "mx-auto max-w-7xl",
        isMobile ? "p-4 pb-24" : "p-6 md:p-10"
      )}>
        {/* Header */}
        <div className={cn(
          "mb-6 flex items-center",
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
          <Button
            variant="outline"
            size={isMobile ? "sm" : "default"}
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2 ml-auto"
          >
            <RefreshCw className={cn(
              "h-4 w-4",
              isRefreshing && "animate-spin"
            )} />
            {!isMobile && (isRefreshing ? "Refreshing..." : "Refresh")}
          </Button>
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
            <FinanceOverviewTab transactions={transformTransactions(transactions)} />
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="transactions" className="mt-0">
            <TransactionHistoryTab initialTransactions={transformTransactions(transactions)} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-0">
            <ReportsTab 
              transactions={transformTransactions(transactions)} 
              balanceData={balanceData ? {
                cash_balance: balanceData.cash,
                account_balance: balanceData.upi + balanceData.card + balanceData.bank_transfer
              } : null}
            />
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
