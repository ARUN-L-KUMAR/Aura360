"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Link2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ScrapedProduct } from "@/lib/types/fashion"

interface ProductLinkFieldProps {
  id: string
  value: string
  onChange: (url: string) => void
  /** Called with the scraped details so the parent form can fill its fields */
  onFetched: (product: ScrapedProduct) => void
  label?: string
  /** Larger input with helper text, for use as the main action of a form */
  prominent?: boolean
}

const looksLikeUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim())

/**
 * Buying-link input that auto-fetches product name, photo, price and details
 * when a link is pasted (or when "Fetch" is pressed).
 */
export function ProductLinkField({ id, value, onChange, onFetched, label = "Buying Link (Optional)", prominent = false }: ProductLinkFieldProps) {
  const [loading, setLoading] = useState(false)

  const fetchDetails = async (url: string) => {
    const target = url.trim()
    if (!looksLikeUrl(target)) {
      toast.error("Paste a full product link starting with https://")
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/scrape-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `Could not fetch product details (HTTP ${response.status}). Please try again.`)

      onFetched(data as ScrapedProduct)
      toast.success("Product details filled in")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch product details")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={id}
            type="url"
            placeholder="Paste an Amazon, Flipkart, Myntra, Meesho or Ajio link"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text").trim()
              if (looksLikeUrl(pasted)) {
                // let the input update first, then auto-fetch the pasted link
                e.preventDefault()
                onChange(pasted)
                void fetchDetails(pasted)
              }
            }}
            className={prominent ? "h-11 pl-9" : "pl-9"}
          />
        </div>
        <Button type="button" variant={prominent ? "default" : "outline"} onClick={() => fetchDetails(value)} disabled={loading || !value} className={prominent ? "h-11 px-5" : "px-4"}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : prominent ? "Fetch details" : "Fetch"}
        </Button>
      </div>
      {loading && <p className="text-sm text-muted-foreground">Fetching product details…</p>}
    </div>
  )
}
