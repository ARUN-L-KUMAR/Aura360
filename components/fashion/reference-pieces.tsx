"use client"

import { useState } from "react"
import { toast } from "sonner"
import { ExternalLink, Info, Link2, Loader2, PenLine, Plus, Ruler, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ComboInput } from "./combo-input"
import { persistImages } from "@/lib/fashion/product-import"
import { CATEGORY_OPTIONS } from "@/lib/fashion/field-options"
import { sizeKindForCategory } from "@/lib/fashion/size-match"
import type { FashionProfileData, ReferencePiece } from "@/lib/fashion/profile"
import type { MeasurementReading, ScrapedProduct, SizeChartRow } from "@/lib/types/fashion"

interface ReferencePiecesProps {
  profile: FashionProfileData
  onChange: (pieces: ReferencePiece[]) => void
  /** Fill measurements / sizes into the profile form (the user still presses Save) */
  onUse: (changes: Partial<FashionProfileData>) => void
}

const CM_PER_INCH = 2.54

// body readings that map straight onto the profile's measurement fields
const BODY_FIELDS = ["chest", "waist", "hips", "shoulders", "neck"] as const
const MANUAL_BODY = ["chest", "waist", "hips", "shoulders"] as const
const MANUAL_GARMENT = [
  { key: "length", label: "Length" },
  { key: "sleeve", label: "Sleeve length" },
  { key: "inseam", label: "Inseam" },
] as const
const LABELS: Record<string, string> = { chest: "Chest", waist: "Waist", hips: "Hips", shoulders: "Shoulders", neck: "Neck" }

const toUnit = (cm: number, unit: "cm" | "in") => Math.round((unit === "in" ? cm / CM_PER_INCH : cm) * 10) / 10
const toCm = (value: number, unit: "cm" | "in") => Math.round((unit === "in" ? value * CM_PER_INCH : value) * 10) / 10

function readingsText(readings: MeasurementReading[], unit: "cm" | "in") {
  return readings.map((r) => `${r.label.toLowerCase()} ${toUnit(r.cm, unit)} ${unit}`).join(" · ")
}

type Mode = "closed" | "link" | "manual"

export function ReferencePieces({ profile, onChange, onUse }: ReferencePiecesProps) {
  const unit = profile.unit ?? "cm"
  const pieces = profile.referencePieces ?? []

  const [mode, setMode] = useState<Mode>("closed")
  const [url, setUrl] = useState("")
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [product, setProduct] = useState<ScrapedProduct | null>(null)
  const [picked, setPicked] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // manual entry
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [category, setCategory] = useState("")
  const [size, setSize] = useState("")
  const [manual, setManual] = useState<Record<string, string>>({})

  const reset = () => {
    setMode("closed")
    setUrl("")
    setFetchError(null)
    setProduct(null)
    setPicked("")
    setName("")
    setBrand("")
    setCategory("")
    setSize("")
    setManual({})
  }

  const chart: SizeChartRow[] = product?.sizeChart ?? []
  const row = chart.find((r) => r.size === picked)

  const fetchProduct = async () => {
    const target = url.trim()
    if (!/^https?:\/\/\S+$/i.test(target)) {
      setFetchError("Paste a full product link starting with https://")
      return
    }
    setFetching(true)
    setFetchError(null)
    setProduct(null)
    setPicked("")
    try {
      const response = await fetch("/api/scrape-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to fetch the product")
      setProduct(data as ScrapedProduct)
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : "Failed to fetch the product")
    } finally {
      setFetching(false)
    }
  }

  const startManualFromProduct = () => {
    if (product) {
      setName(product.product_name)
      setBrand(product.brand)
      setCategory(product.category)
    }
    setMode("manual")
  }

  const addPiece = (piece: ReferencePiece) => {
    onChange([...pieces, piece])
    reset()
    toast.success("Piece added. Press Save on this page to keep it.")
  }

  const saveFromLink = async () => {
    if (!product || !row) return
    setSaving(true)
    try {
      const [image] = product.images[0] ? await persistImages([product.images[0]]) : [undefined]
      addPiece({
        id: crypto.randomUUID(),
        name: product.product_name,
        brand: product.brand || undefined,
        category: product.category || undefined,
        imageUrl: image,
        link: product.buying_link,
        platform: product.platform,
        size: row.size,
        body: row.body,
        garment: row.garment,
        addedAt: new Date().toISOString(),
      })
    } finally {
      setSaving(false)
    }
  }

  const saveManual = () => {
    const toReadings = (entries: Array<{ key: string; label: string }>) =>
      entries
        .map(({ key, label }) => {
          const value = Number.parseFloat(manual[key] ?? "")
          return Number.isFinite(value) && value > 0 ? { key, label, cm: toCm(value, unit) } : null
        })
        .filter((r): r is MeasurementReading => r !== null)

    if (!name.trim() || !size.trim()) {
      toast.error("Add a name and the size you wear")
      return
    }
    addPiece({
      id: crypto.randomUUID(),
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      imageUrl: product?.images[0],
      link: product?.buying_link,
      platform: product?.platform,
      size: size.trim(),
      body: toReadings(MANUAL_BODY.map((key) => ({ key, label: LABELS[key] }))),
      garment: toReadings(MANUAL_GARMENT.map((g) => ({ key: g.key, label: g.label }))),
      addedAt: new Date().toISOString(),
    })
  }

  /** Put this piece's body measurements and size into the profile form. */
  const usePiece = (piece: ReferencePiece) => {
    const changes: Record<string, unknown> = {}
    const done: string[] = []

    for (const reading of piece.body) {
      if ((BODY_FIELDS as readonly string[]).includes(reading.key)) {
        changes[reading.key] = toUnit(reading.cm, unit)
        done.push(`${reading.label.toLowerCase()} ${toUnit(reading.cm, unit)} ${unit}`)
      }
    }

    const kind = sizeKindForCategory(piece.category || piece.name)
    const sizeField = { tops: "topSize", bottoms: "bottomSize", dresses: "dressSize", shoes: "shoeSize" }[kind ?? "tops"]
    if (kind) {
      const value = kind === "shoes" ? piece.size.replace(/[^\d.]/g, "") : piece.size
      if (value) {
        changes[sizeField] = value
        done.push(`${sizeField.replace("Size", "")} size ${value}`)
      }
    }

    const label = piece.brand || piece.name.split(" ")[0]
    const note = `${label}: ${piece.size}`
    const notes = profile.sizeNotes ?? ""
    if (!notes.includes(note)) changes.sizeNotes = (notes ? `${notes}, ${note}` : note).slice(0, 500)

    onUse(changes as Partial<FashionProfileData>)
    toast.success(done.length ? `Filled in ${done.join(", ")}. Review, then press Save.` : "Added a sizing note. Press Save to keep it.")
  }

  const numberInput = (key: string, label: string) => (
    <div key={key} className="grid gap-1.5">
      <Label htmlFor={`ref-${key}`} className="text-xs">
        {label} ({unit})
      </Label>
      <Input
        id={`ref-${key}`}
        type="number"
        step="0.1"
        min={0}
        placeholder="0"
        value={manual[key] ?? ""}
        onChange={(e) => setManual((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <Card className="bg-card/80 backdrop-blur-sm lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest">Pieces that fit me</CardTitle>
            <CardDescription className="text-xs">
              Add something you own that fits well. We read its size chart for the size you wear, so your measurements and sizes come from a real garment.
            </CardDescription>
          </div>
          {mode === "closed" && (
            <Button type="button" variant="outline" size="sm" className="shrink-0 text-[10px] font-bold uppercase tracking-widest" onClick={() => setMode("link")}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add a piece
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="grid gap-4">
        {/* ── Add from a link ── */}
        {mode === "link" && (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest">Add from a product link</p>
              <button type="button" aria-label="Close" onClick={reset} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Link to the piece you own (Myntra, Amazon, Flipkart…)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void fetchProduct()
                    }
                  }}
                />
              </div>
              <Button type="button" onClick={fetchProduct} disabled={fetching || !url}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}
              </Button>
            </div>
            {fetchError && <p className="text-xs text-destructive">{fetchError}</p>}

            {product && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {product.images[0] && <img src={product.images[0]} alt="" className="h-16 w-12 rounded-md border bg-muted object-contain" />}
                  <div className="min-w-0">
                    {product.brand && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{product.brand}</p>}
                    <p className="line-clamp-2 text-sm font-semibold">{product.product_name}</p>
                  </div>
                </div>

                {chart.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      <Label>Which size do you wear?</Label>
                      <div className="flex flex-wrap gap-2">
                        {chart.map((r) => (
                          <button
                            key={r.size}
                            type="button"
                            aria-pressed={picked === r.size}
                            title={r.available ? undefined : "Sold out right now, but you can still choose it"}
                            onClick={() => setPicked(r.size)}
                            className={`flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-xs font-bold transition-colors ${
                              picked === r.size ? "border-foreground bg-foreground text-background" : "hover:border-foreground/50"
                            } ${r.available ? "" : "text-muted-foreground line-through"}`}
                          >
                            {r.size}
                          </button>
                        ))}
                      </div>
                    </div>

                    {row && (
                      <div className="space-y-2 rounded-lg border bg-background p-3 text-sm">
                        {row.body.length > 0 && (
                          <p>
                            <span className="font-bold">Body it&apos;s made for:</span> {readingsText(row.body, unit)}
                          </p>
                        )}
                        {row.garment.length > 0 && (
                          <p>
                            <span className="font-bold">Garment measures:</span> {readingsText(row.garment, unit)}
                          </p>
                        )}
                        {row.body.length === 0 && (
                          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            This shop lists the garment&apos;s own measurements for this item, not body measurements. We save them as
                            &quot;how it fits you&quot;, but they won&apos;t fill in your body measurements.
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    This page doesn&apos;t list measurements for each size. You can type them in yourself instead.
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {chart.length > 0 && (
                    <Button type="button" onClick={saveFromLink} disabled={!row || saving} className="bg-indigo-600 hover:bg-indigo-700">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save piece
                    </Button>
                  )}
                  <Button type="button" variant="outline" onClick={startManualFromProduct}>
                    <PenLine className="mr-2 h-4 w-4" /> Enter measurements myself
                  </Button>
                </div>
              </div>
            )}

            {!product && (
              <button type="button" onClick={() => setMode("manual")} className="text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground">
                No link? Enter a piece by hand
              </button>
            )}
          </div>
        )}

        {/* ── Add by hand ── */}
        {mode === "manual" && (
          <div className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest">Add a piece by hand</p>
              <button type="button" aria-label="Close" onClick={reset} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="col-span-2 grid gap-1.5">
                <Label htmlFor="ref-name" className="text-xs">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="ref-name" placeholder="e.g., Blue Levi's 511 jeans" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ref-brand" className="text-xs">
                  Brand
                </Label>
                <Input id="ref-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ref-size" className="text-xs">
                  Size you wear <span className="text-destructive">*</span>
                </Label>
                <Input id="ref-size" placeholder="e.g., 32 or M" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
              <div className="col-span-2 grid gap-1.5 sm:col-span-4">
                <Label htmlFor="ref-category" className="text-xs">
                  Category
                </Label>
                <ComboInput id="ref-category" placeholder="Pick or type" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} capitalize />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Body measurements the size is made for (from its size chart), all optional</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{MANUAL_BODY.map((k) => numberInput(k, LABELS[k]))}</div>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Garment measurements, all optional</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{MANUAL_GARMENT.map((g) => numberInput(g.key, g.label))}</div>
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={saveManual} className="bg-indigo-600 hover:bg-indigo-700">
                Save piece
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ── Saved pieces ── */}
        {pieces.length === 0 && mode === "closed" && (
          <p className="rounded-lg border-2 border-dashed py-8 text-center text-xs text-muted-foreground">
            No pieces yet. Add a favorite pair of jeans or a shirt that fits perfectly.
          </p>
        )}

        {pieces.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {pieces.map((piece) => {
              const hasBody = piece.body.some((r) => (BODY_FIELDS as readonly string[]).includes(r.key))
              return (
                <div key={piece.id} className="flex gap-3 rounded-xl border p-3">
                  <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {piece.imageUrl ? <img src={piece.imageUrl} alt="" className="h-full w-full object-contain" loading="lazy" /> : <Ruler className="h-6 w-6 text-muted-foreground/40" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {piece.brand && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{piece.brand}</p>}
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{piece.name}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        Size {piece.size}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-muted-foreground">
                      {piece.body.length > 0 && <p>Body: {readingsText(piece.body, unit)}</p>}
                      {piece.garment.length > 0 && <p>Garment: {readingsText(piece.garment, unit)}</p>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-[10px] font-bold uppercase tracking-widest" onClick={() => usePiece(piece)}>
                        {hasBody ? "Use measurements & size" : "Use size"}
                      </Button>
                      {piece.link && (
                        <a href={piece.link} target="_blank" rel="noreferrer" aria-label="Open product page" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        aria-label={`Remove ${piece.name}`}
                        onClick={() => onChange(pieces.filter((p) => p.id !== piece.id))}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
