"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ShareTransactionModal } from "@/components/finance/share-transaction-modal"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Share2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

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
  const [isLoading, setIsLoading] = useState(true)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const parseSharedData = async () => {
      try {
        // Get shared data from URL params (Web Share Target API)
        const text = searchParams.get("text") || ""
        const title = searchParams.get("title") || ""
        const url = searchParams.get("url") || ""

        // Combine all shared content
        const sharedContent = [title, text, url].filter(Boolean).join(" ")

        if (!sharedContent.trim()) {
          setError("No transaction data received. Please try sharing again.")
          setIsLoading(false)
          return
        }

        // Parse the shared data using our API
        const response = await fetch(
          `/api/finance/share-transaction?${new URLSearchParams({
            text: sharedContent,
            title: title,
          })}`
        )

        if (!response.ok) {
          throw new Error("Failed to parse shared data")
        }

        const data = await response.json()
        setParsedData(data)
        setShowModal(true)
        setIsLoading(false)
      } catch (err) {
        console.error("Error parsing shared data:", err)
        setError("Failed to process the shared transaction. Please try again.")
        setIsLoading(false)
      }
    }

    parseSharedData()
  }, [searchParams])

  const handleSuccess = () => {
    // Redirect to finance dashboard after successful addition
    router.push("/dashboard/finance")
    router.refresh()
  }

  const handleClose = () => {
    setShowModal(false)
    // Redirect to finance dashboard
    router.push("/dashboard/finance")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Processing Transaction</h2>
            <p className="text-sm text-muted-foreground text-center">
              Reading your shared payment details...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

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
              <Button variant="outline" asChild>
                <Link href="/dashboard/finance">Go to Finance</Link>
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      {/* Background content */}
      <div className="text-center">
        <Share2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Processing shared transaction...</p>
      </div>

      {/* Modal */}
      {parsedData && (
        <ShareTransactionModal
          open={showModal}
          onOpenChange={handleClose}
          initialData={parsedData}
          onSuccess={handleSuccess}
        />
      )}
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
