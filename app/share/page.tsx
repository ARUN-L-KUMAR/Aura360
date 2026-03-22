"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShareTransactionModal } from "@/components/finance/share-transaction-modal"
import { Card, CardContent } from "@/components/ui/card"
import {
  Loader2,
  Share2,
  AlertCircle,
  DollarSign,
  LinkIcon,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type SelectedModule = null | "finance" | "link"
type SavedState = { module: string; route: string } | null

interface ParsedData {
  amount: number | null
  date: string
  time?: string | null
  description: string
  category: string
  payment_method: string
  receiver?: string | null
  transaction_id?: string | null
  type?: "expense" | "income"
  raw_text: string
  parsed_by?: "gemini" | "regex"
}

// ─── Heuristics ────────────────────────────────────────────────────
// Detect if shared text looks like a financial transaction
const FINANCE_KEYWORDS = /(?:₹|rs\.?|inr|paid|debited|credited|deducted|transferred|sent|received|payment|upi|gpay|phonepe|paytm|neft|imps|amount)/i

function detectSharedContentType(text: string, url: string, title: string) {
  const combined = [title, text].join(" ")
  const hasUrl = url.trim().length > 0 || /https?:\/\//.test(text)
  const looksLikeTransaction = FINANCE_KEYWORDS.test(combined)

  return { hasUrl, looksLikeTransaction }
}

// Module display names and routes
const MODULE_META: Record<string, { label: string; route: string; emoji: string }> = {
  fashion:  { label: "Fashion",  route: "/dashboard/fashion",  emoji: "👗" },
  notes:    { label: "Notes",    route: "/dashboard/notes",    emoji: "📝" },
  saved:    { label: "Saved",    route: "/dashboard/saved",    emoji: "🔖" },
  food:     { label: "Food",     route: "/dashboard/food",     emoji: "🍔" },
  fitness:  { label: "Fitness",  route: "/dashboard/fitness",  emoji: "💪" },
}

// ─── Component ─────────────────────────────────────────────────────
function ShareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const sharedText  = searchParams.get("text")  || ""
  const sharedTitle = searchParams.get("title") || ""
  const sharedUrl   = searchParams.get("url")   || ""
  const sharedContent = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(" ")

  // Extract a clean URL from shared content
  const extractedUrl =
    sharedUrl.trim() ||
    (sharedText.match(/https?:\/\/[^\s]+/)?.[0]) ||
    ""

  const { hasUrl, looksLikeTransaction } = detectSharedContentType(sharedText, sharedUrl, sharedTitle)

  // Decide which options to show (improvement #4 — hide inapplicable ones)
  // Show Finance if text has transaction signals OR there's no URL (catch-all)
  const showFinance = looksLikeTransaction || !hasUrl
  // Show Save from Link only when there's actually a URL
  const showSaveLink = hasUrl

  // Suggestion logic (improvement #1)
  const financeIsSuggested  = looksLikeTransaction && !hasUrl
  const saveLinkIsSuggested = hasUrl && !looksLikeTransaction

  // ─── State ───────────────────────────────────────────────────────
  const [selectedModule, setSelectedModule] = useState<SelectedModule>(null)
  const [isLoading, setIsLoading]           = useState(false)
  const [loadingLabel, setLoadingLabel]     = useState("")
  const [parsedData, setParsedData]         = useState<ParsedData | null>(null)
  const [showFinanceModal, setShowFinanceModal] = useState(false)
  const [savedState, setSavedState]         = useState<SavedState>(null) // improvement #3
  const [error, setError]                   = useState<string | null>(null)

  // ─── Finance flow ────────────────────────────────────────────────
  const handleFinanceSelected = async () => {
    setSelectedModule("finance")
    setIsLoading(true)
    setLoadingLabel("Reading your shared payment details...")
    setError(null)

    try {
      const response = await fetch(
        `/api/finance/share-transaction?${new URLSearchParams({
          text: sharedContent,
          title: sharedTitle,
        })}`,
        { redirect: "manual" }
      )

      if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
        router.push("/auth/login")
        return
      }
      if (!response.ok) throw new Error("Failed to parse shared data")

      const data = await response.json()
      setParsedData(data)
      setShowFinanceModal(true)
    } catch (err) {
      console.error("Error parsing shared data:", err)
      setError("Failed to process the shared transaction. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleFinanceSuccess = () => {
    router.push("/dashboard/finance")
    router.refresh()
  }

  const handleFinanceClose = () => {
    setShowFinanceModal(false)
    router.push("/dashboard/finance")
  }

  // ─── Save from Link flow ─────────────────────────────────────────
  const handleSaveFromLink = async () => {
    setSelectedModule("link")
    setIsLoading(true)
    setLoadingLabel("Detecting link type…")
    setError(null)

    try {
      const response = await fetch("/api/ingest-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        redirect: "manual",
        body: JSON.stringify({ url: extractedUrl, destination: "auto", autoSave: true }),
      })

      if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
        router.push("/auth/login")
        return
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error || "Failed to save link")
      }

      const data = await response.json()
      const destination: string = data.persistedTo ?? "saved"
      const meta = MODULE_META[destination] ?? MODULE_META.saved

      // improvement #3 — show confirmation screen before redirecting
      setSavedState({ module: destination, route: meta.route })
    } catch (err) {
      console.error("Error saving shared link:", err)
      setError("Failed to save the shared link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    setSelectedModule(null)
    setError(null)
    setIsLoading(false)
    setSavedState(null)
  }

  // ─── No content ──────────────────────────────────────────────────
  if (!sharedContent.trim()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Nothing to Share</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              No content was received. Please try sharing again from the other app.
            </p>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {selectedModule === "finance" ? "Processing Transaction" : "Detecting Content"}
            </h2>
            <p className="text-sm text-muted-foreground text-center">{loadingLabel}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">{error}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Improvement #3: Saved confirmation screen ───────────────────
  if (savedState) {
    const meta = MODULE_META[savedState.module] ?? MODULE_META.saved
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-semibold">Saved!</h2>
              <p className="text-sm text-muted-foreground">
                Link was saved to{" "}
                <span className="font-medium text-foreground">
                  {meta.emoji} {meta.label}
                </span>
              </p>
            </div>
            <Button
              className="gap-2"
              onClick={() => {
                router.push(savedState.route)
                router.refresh()
              }}
            >
              <ExternalLink className="w-4 h-4" />
              Go to {meta.label}
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Finance modal ───────────────────────────────────────────────
  if (selectedModule === "finance" && parsedData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Review your transaction details…</p>
        </div>
        <ShareTransactionModal
          open={showFinanceModal}
          onOpenChange={handleFinanceClose}
          initialData={parsedData}
          onSuccess={handleFinanceSuccess}
        />
      </div>
    )
  }

  // ─── Module Chooser ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 pb-6 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto">
              <Share2 className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold">Shared Content</h2>
            <p className="text-sm text-muted-foreground">Where would you like to save this?</p>
          </div>

          {/* Preview of shared content */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
            {sharedTitle && (
              <p className="text-sm font-medium line-clamp-2">{sharedTitle}</p>
            )}
            {sharedText && sharedText !== sharedTitle && (
              <p className="text-xs text-muted-foreground line-clamp-3">{sharedText}</p>
            )}
            {sharedUrl && (
              <p className="text-xs text-blue-600 dark:text-blue-400 break-all line-clamp-1">
                {sharedUrl}
              </p>
            )}
          </div>

          {/* Options — only show relevant ones (improvement #4) */}
          <div className="grid gap-3">
            {showFinance && (
              <button
                onClick={handleFinanceSelected}
                className={`
                  group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all
                  hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                  ${financeIsSuggested
                    ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border"}
                `}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                  <DollarSign className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Add as Transaction</p>
                  <p className="text-xs text-muted-foreground">
                    Save to Finance as an expense or income entry
                  </p>
                </div>
                {financeIsSuggested && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 rounded-full px-2 py-0.5">
                    Suggested
                  </span>
                )}
              </button>
            )}

            {showSaveLink && (
              <button
                onClick={handleSaveFromLink}
                className={`
                  group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all
                  hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30
                  ${saveLinkIsSuggested
                    ? "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20"
                    : "border-border"}
                `}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50 group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50 transition-colors">
                  <LinkIcon className="h-6 w-6 text-violet-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Save from Link</p>
                  <p className="text-xs text-muted-foreground">
                    Auto-detects and saves to the right module
                  </p>
                </div>
                {saveLinkIsSuggested && (
                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-100 dark:bg-violet-900/50 rounded-full px-2 py-0.5">
                    Suggested
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Cancel */}
          <div className="text-center">
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <Link href="/dashboard">Cancel</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SharePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-sm text-muted-foreground">Loading…</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  )
}
