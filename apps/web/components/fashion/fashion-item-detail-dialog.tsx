"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ChevronLeft, ChevronRight, Edit, ExternalLink, Shirt, Star } from "lucide-react"
import { costPerWear } from "@/lib/fashion/wear-stats"
import { galleryOf } from "@/lib/fashion/product-import"
import { sizeAvailability, normalizeSize } from "@/lib/fashion/size-match"
import { useFashionProfile } from "./use-fashion-profile"
import type { FashionItem } from "@/lib/types/fashion"

interface FashionItemDetailDialogProps {
  item: FashionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: () => void
}

const money = (value: number) => `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`

const formatDate = (value: string | Date | null | undefined) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

const platformName = (platform?: string) => (platform ? platform[0].toUpperCase() + platform.slice(1) : null)

/** Product-page style view of a wardrobe / wishlist item: photo gallery on one side, details on the other. */
export function FashionItemDetailDialog({ item, open, onOpenChange, onEdit }: FashionItemDetailDialogProps) {
  const gallery = galleryOf(item)
  const [index, setIndex] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(new Set())

  const photos = gallery.filter((url) => !broken.has(url))
  const current = photos[Math.min(index, Math.max(photos.length - 1, 0))]

  useEffect(() => {
    if (open) setIndex(0)
  }, [open, item.id])

  useEffect(() => {
    if (!open || photos.length < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length)
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, photos.length])

  const meta = item.metadata ?? {}
  const buyingLink = meta.buyingLink as string | undefined
  const price = item.price ? Number(item.price) : undefined
  const budget = typeof meta.expectedBudget === "number" ? meta.expectedBudget : undefined
  const shownPrice = price ?? budget
  const originalPrice = typeof meta.originalPrice === "number" ? meta.originalPrice : undefined
  const showMrp = originalPrice !== undefined && shownPrice !== undefined && originalPrice > shownPrice
  const availableSizes = Array.isArray(meta.availableSizes) ? (meta.availableSizes as string[]) : []
  const sizeChips = Array.from(new Set([...(item.size ? [item.size] : []), ...availableSizes]))
  const profile = useFashionProfile()
  // "Not available in your size" only matters for things you haven't bought yet
  const availability = item.status === "wishlist" ? sizeAvailability(profile, item.category, availableSizes) : null
  const mySizeKey = availability?.mySize ? normalizeSize(availability.mySize) : null
  const rating = typeof meta.rating === "number" ? meta.rating : undefined
  const reviewsCount = typeof meta.reviewsCount === "number" ? meta.reviewsCount : undefined
  const platform = platformName(meta.platform as string | undefined)
  const description = item.notes || item.description
  const cpw = item.status === "wardrobe" ? costPerWear(item) : null

  const rows: Array<[string, string | null | undefined]> = [
    ["Category", item.category],
    ["Subcategory", item.subcategory],
    ["Color", item.color],
    ["Condition", item.condition ?? (meta.condition as string | undefined)],
    ["Purchased on", item.status === "wardrobe" ? formatDate(item.purchaseDate) : null],
    ["Times worn", item.status === "wardrobe" ? `${item.wearCount ?? 0}` : null],
    ["Cost per wear", cpw !== null ? money(cpw) : null],
    ["Buy by", item.status === "wishlist" ? formatDate(meta.buyDeadline as string | undefined) : null],
    ["Added from", platform],
  ]
  const visibleRows = rows.filter(([, value]) => Boolean(value))

  const go = (delta: number) => setIndex((i) => (i + delta + photos.length) % photos.length)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-5xl">
        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* ── Gallery ── */}
          <div className="bg-muted/40 p-4 md:sticky md:top-0 md:self-start md:p-6">
            <div className="flex flex-col gap-3 md:flex-row-reverse">
              <div className="relative flex-1 overflow-hidden rounded-xl border bg-muted">
                <div className="flex aspect-[3/4] max-h-[70vh] w-full items-center justify-center md:max-h-[78vh]">
                  {current ? (
                    <img
                      key={current}
                      src={current}
                      alt={item.name}
                      className="h-full w-full object-contain"
                      onError={() => setBroken((prev) => new Set(prev).add(current))}
                    />
                  ) : (
                    <Shirt className="h-20 w-20 text-muted-foreground/30" />
                  )}
                </div>
                {photos.length > 1 && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Previous photo"
                      className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full opacity-90"
                      onClick={() => go(-1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      aria-label="Next photo"
                      className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full opacity-90"
                      onClick={() => go(1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold tabular-nums shadow">
                      {Math.min(index, photos.length - 1) + 1} / {photos.length}
                    </span>
                  </>
                )}
              </div>

              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto md:max-h-[78vh] md:w-16 md:flex-col md:overflow-y-auto md:overflow-x-visible">
                  {photos.map((url, i) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setIndex(i)}
                      aria-label={`Show photo ${i + 1}`}
                      className={`aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-md border-2 bg-muted md:w-full ${
                        url === current ? "border-foreground" : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Details ── */}
          <div className="space-y-5 p-5 md:p-8">
            <div className="space-y-1.5">
              {item.brand && <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{item.brand}</p>}
              <DialogTitle className="flex items-start gap-2 text-xl font-bold leading-snug tracking-tight">
                <span>{item.name}</span>
                {item.isFavorite && <Star className="mt-1 h-4 w-4 shrink-0 fill-current" />}
              </DialogTitle>
              <DialogDescription className="sr-only">Details for {item.name}</DialogDescription>
              {rating !== undefined && (
                <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs font-bold">
                  <span className="flex items-center gap-1">
                    {rating.toFixed(1)} <Star className="h-3 w-3 fill-current" />
                  </span>
                  {reviewsCount !== undefined && (
                    <>
                      <span className="h-3 w-px bg-border" />
                      <span className="font-medium text-muted-foreground">
                        {reviewsCount >= 1000 ? `${(reviewsCount / 1000).toFixed(1)}k` : reviewsCount} ratings
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="border-y py-4">
              {shownPrice !== undefined ? (
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-2xl font-extrabold">{money(shownPrice)}</span>
                  {price === undefined && <span className="text-xs text-muted-foreground">expected budget</span>}
                  {showMrp && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        MRP <span className="line-through">{money(originalPrice!)}</span>
                      </span>
                      {typeof meta.discount === "string" && (
                        <span className="text-sm font-bold text-orange-500">({meta.discount.replace(/\s*off$/i, "").toUpperCase()} OFF)</span>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No price added</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest">
                  {item.status}
                </Badge>
                {item.color && (
                  <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest">
                    {item.color}
                  </Badge>
                )}
              </div>
            </div>

            {sizeChips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest">Size</p>
                <div className="flex flex-wrap gap-2">
                  {sizeChips.map((size) => (
                    <span
                      key={size}
                      title={mySizeKey && normalizeSize(size) === mySizeKey ? "Your size" : undefined}
                      className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-bold ${
                        size === item.size ? "border-foreground bg-foreground text-background" : "text-muted-foreground"
                      } ${mySizeKey && normalizeSize(size) === mySizeKey && size !== item.size ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : ""}`}
                    >
                      {size}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {availability?.status === "unavailable" && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Not available in your size (<strong>{availability.mySize}</strong>). Sizes listed: {availableSizes.join(", ")}.
                </span>
              </div>
            )}
            {availability?.status === "available" && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Your size ({availability.mySize}) is available</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              {buyingLink && (
                <Button asChild className="flex-1 text-xs font-bold uppercase tracking-widest">
                  <a href={buyingLink} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {platform ? `View on ${platform}` : "Buy item"}
                  </a>
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-xs font-bold uppercase tracking-widest"
                onClick={() => {
                  onOpenChange(false)
                  onEdit()
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </div>

            {visibleRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest">Item details</p>
                <dl className="divide-y rounded-lg border text-sm">
                  {visibleRows.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4 px-3 py-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium capitalize">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {((item.occasion?.length ?? 0) > 0 || (item.season?.length ?? 0) > 0 || (item.tags?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1.5">
                {item.occasion?.map((o) => (
                  <Badge key={`o-${o}`} variant="outline" className="capitalize">
                    {o}
                  </Badge>
                ))}
                {item.season?.map((s) => (
                  <Badge key={`s-${s}`} variant="outline" className="capitalize">
                    {s}
                  </Badge>
                ))}
                {item.tags?.map((t) => (
                  <Badge key={`t-${t}`} variant="secondary">
                    #{t}
                  </Badge>
                ))}
              </div>
            )}

            {description && (
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest">Description</p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
