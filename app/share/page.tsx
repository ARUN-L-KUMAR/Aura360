"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShareTransactionModal } from "@/components/finance/share-transaction-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Share2, AlertCircle, DollarSign, Bookmark, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"

type SelectedModule = null | "finance" | "saved"

interface ParsedData {
  amount: number | null
  date: string
  description: string
  category: string
  payment_method: string
  raw_text: string
}

function ShareContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Shared content from URL params
  const sharedText = searchParams.get("text") || ""
  const sharedTitle = searchParams.get("title") || ""
  const sharedUrl = searchParams.get("url") || ""
  const sharedContent = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(" ")

  // State
  const [selectedModule, setSelectedModule] = useState<SelectedModule>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [showFinanceModal, setShowFinanceModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if no content was shared
  const hasContent = sharedContent.trim().length > 0

  // Simple heuristic: does the shared content look like a URL?
  const looksLikeUrl =
    sharedUrl.trim().length > 0 ||
    /https?:\/\//.test(sharedText) ||
    /https?:\/\//.test(sharedTitle)

  // ─── Finance flow ──────────────────────────────────────────────────
  const handleFinanceSelected = async () => {
    setSelectedModule("finance")
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/finance/share-transaction?${new URLSearchParams({
          text: sharedContent,
          title: sharedTitle,
        })}`,
        { redirect: "manual" }
      )

      // Handle auth redirects (302 to login)
      if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
        router.push("/auth/login")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to parse shared data")
      }

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

  // ─── Saved Items flow ──────────────────────────────────────────────
  const handleSavedSelected = async () => {
    setSelectedModule("saved")
    setIsLoading(true)
    setError(null)

    try {
      // If there's a URL, use the ingest-link API for smart metadata extraction
      const urlToSave =
        sharedUrl.trim() ||
        (sharedText.match(/https?:\/\/[^\s]+/)?.[0]) ||
        ""

      if (urlToSave) {
        const response = await fetch("/api/ingest-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "manual",
          body: JSON.stringify({
            url: urlToSave,
            destination: "saved",
            autoSave: true,
          }),
        })

        // Handle auth redirects (302 to login)
        if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
          router.push("/auth/login")
          return
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error || "Failed to save link")
        }

        const data = await response.json()
        toast.success(
          data.persistedTo
            ? `Saved to ${data.persistedTo}`
            : "Link saved successfully"
        )
      } else {
        // No URL found — save as a plain text item
        const response = await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "manual",
          body: JSON.stringify({
            type: "other",
            title: sharedTitle || sharedText.slice(0, 100) || "Shared item",
            description: sharedText || undefined,
          }),
        })

        // Handle auth redirects
        if (response.type === "opaqueredirect" || response.status === 302 || response.status === 301) {
          router.push("/auth/login")
          return
        }

        if (!response.ok) {
          throw new Error("Failed to save item")
        }

        toast.success("Item saved successfully")
      }

      router.push("/dashboard/saved")
      router.refresh()
    } catch (err) {
      console.error("Error saving shared item:", err)
      setError("Failed to save the shared item. Please try again.")
      setIsLoading(false)
    }
  }

  // ─── Back to chooser ──────────────────────────────────────────────
  const handleBack = () => {
    setSelectedModule(null)
    setError(null)
    setIsLoading(false)
  }

  // ─── No content shared ────────────────────────────────────────────
  if (!hasContent) {
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

  // ─── Loading state ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold mb-2">
              {selectedModule === "finance"
                ? "Processing Transaction"
                : "Saving Item"}
            </h2>
            <p className="text-sm text-muted-foreground text-center">
              {selectedModule === "finance"
                ? "Reading your shared payment details..."
                : "Saving your shared content..."}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Error state ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              {error}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Finance modal (after finance was selected and data parsed) ───
  if (selectedModule === "finance" && parsedData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Processing shared transaction...</p>
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

  // ─── Module Chooser (default screen) ──────────────────────────────
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
            <p className="text-sm text-muted-foreground">
              Where would you like to save this?
            </p>
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

          {/* Module options */}
          <div className="grid gap-3">
            {/* Finance option */}
            <button
              onClick={handleFinanceSelected}
              className={`
                group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all
                hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30
                ${!looksLikeUrl
                  ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20"
                  : "border-border"
                }
              `}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/50 transition-colors group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50">
                <DollarSign className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Add as Transaction</p>
                <p className="text-xs text-muted-foreground">
                  Save to Finance as an expense or income entry
                </p>
              </div>
              {!looksLikeUrl && (
                <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 rounded-full px-2 py-0.5">
                  Suggested
                </span>
              )}
            </button>

            {/* Saved Items option */}
            <button
              onClick={handleSavedSelected}
              className={`
                group relative flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all
                hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30
                ${looksLikeUrl
                  ? "border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20"
                  : "border-border"
                }
              `}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/50 transition-colors group-hover:bg-violet-200 dark:group-hover:bg-violet-800/50">
                <Bookmark className="h-6 w-6 text-violet-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm">Save as Bookmark</p>
                <p className="text-xs text-muted-foreground">
                  Save to your bookmarked items collection
                </p>
              </div>
              {looksLikeUrl && (
                <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-violet-600 bg-violet-100 dark:bg-violet-900/50 rounded-full px-2 py-0.5">
                  Suggested
                </span>
              )}
            </button>
          </div>

          {/* Cancel link */}
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
              <p className="text-sm text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ShareContent />
    </Suspense>
  )
}
