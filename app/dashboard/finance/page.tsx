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
import { Logo } from "@/components/ui/logo"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { Transaction, BalanceData as FinanceBalanceData } from "@/lib/types/finance"

// Internal interface for local state handling balance breakdown
interface LocalBalanceBreakdown {
  cash: number
  card: number
  upi: number
  bank_transfer: number
}

// Helper to transform transaction format for components if needed
const transformTransactions = (transactions: Transaction[]): Transaction[] => {
  return transactions
    .filter(t => t.type !== "transfer") // Filter out transfer type as components don't support it
}

export default function FinancePage() {
  const router = useRouter()
  const isMobile = useIsMobile()
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceData, setBalanceData] = useState<LocalBalanceBreakdown | null>(null)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <div className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Loading finances...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={cn(
        "mx-auto max-w-7xl",
        isMobile ? "p-6 pb-24" : "p-10"
      )}>
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center border shadow-sm">
              <DollarSign className="w-6 h-6 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <div className="px-2 py-0.5 rounded bg-secondary border text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-fit mb-1">
                Treasury
              </div>
              <h1 className="text-4xl font-bold tracking-tight">Finance</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                    className="gap-2 font-bold text-[10px] uppercase tracking-widest border-border shadow-none hover:bg-secondary h-9 px-4"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Import from GPay
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px] font-bold">Import from shared transactions</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="gap-2 font-bold text-[10px] uppercase tracking-widest border-border shadow-none hover:bg-secondary h-9 px-4"
            >
              <RefreshCw className={cn(
                "h-3.5 w-3.5",
                isRefreshing && "animate-spin"
              )} />
              {isRefreshing ? "Syncing..." : "Sync Data"}
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full">
          {/* Desktop Tabs */}
          {!isMobile && (
            <TabsList className="flex items-center justify-start gap-1 bg-secondary rounded-lg p-1 border w-fit mb-8 h-auto">
              {[
                { val: "overview", label: "Overview", icon: LayoutDashboard },
                { val: "transactions", label: "Ledger", icon: History },
                { val: "reports", label: "Analytics", icon: BarChart3 }
              ].map(tab => (
                <TabsTrigger 
                  key={tab.val}
                  value={tab.val} 
                  className="gap-2 px-4 py-2 rounded-md text-sm data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          )}

          {/* Mobile Bottom Navigation Tabs */}
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
              <TabsList className="grid grid-cols-3 h-16 bg-transparent">
                <TabsTrigger 
                  value="overview" 
                  className="flex-col gap-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px] text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-secondary/50"
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="transactions" 
                  className="flex-col gap-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px] text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-secondary/50"
                >
                  <History className="h-5 w-5" />
                  History
                </TabsTrigger>
                <TabsTrigger 
                  value="reports" 
                  className="flex-col gap-1 h-full rounded-none font-bold uppercase tracking-widest text-[10px] text-muted-foreground data-[state=active]:text-foreground data-[state=active]:bg-secondary/50"
                >
                  <BarChart3 className="h-5 w-5" />
                  Reports
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          {/* Tab Contents */}
          <div className="mt-0">
            <TabsContent value="overview">
              <FinanceOverviewTab transactions={transformTransactions(transactions)} />
            </TabsContent>

            <TabsContent value="transactions">
              <TransactionHistoryTab initialTransactions={transformTransactions(transactions)} />
            </TabsContent>

            <TabsContent value="reports">
              <ReportsTab 
                transactions={transformTransactions(transactions)} 
                balanceData={balanceData ? {
                  id: null,
                  workspaceId: "",
                  userId: "",
                  cashBalance: balanceData.cash,
                  accountBalance: balanceData.upi + balanceData.card + balanceData.bank_transfer,
                  realBalance: balanceData.cash + balanceData.upi + balanceData.card + balanceData.bank_transfer,
                  expectedBalance: balanceData.cash + balanceData.upi + balanceData.card + balanceData.bank_transfer,
                  difference: 0,
                  updatedAt: new Date().toISOString()
                } : null}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Go to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          className={cn(
            "fixed z-50 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground",
            isMobile ? "bottom-20 right-6 h-12 w-12" : "bottom-10 right-10 h-14 w-14"
          )}
          size="icon"
        >
          <ArrowUp className="h-6 w-6" />
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
