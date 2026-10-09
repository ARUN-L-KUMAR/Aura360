"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ImageUpload } from "./image-upload"
import { ProductLinkField } from "./product-link-field"
import { FashionImagePreview } from "./fashion-image-preview"
import { ComboInput } from "./combo-input"
import { useFashionProfile } from "./use-fashion-profile"
import { sizeAvailability } from "@/lib/fashion/size-match"
import { CATEGORY_OPTIONS, COLOR_OPTIONS, sizeOptions } from "@/lib/fashion/field-options"
import { persistImages, productMetadata } from "@/lib/fashion/product-import"
import type { FashionItem, FashionMetadata, ScrapedProduct } from "@/lib/types/fashion"

type Status = "wardrobe" | "wishlist" | "sold" | "donated"

interface FormState {
  status: Status
  name: string
  category: string
  subcategory: string
  brand: string
  color: string
  size: string
  price: string
  purchaseDate: string
  expectedBudget: string
  buyDeadline: string
  condition: string
  occasion: string[]
  season: string[]
  tags: string[]
  notes: string
  isFavorite: boolean
  link: string
  imageUrl: string
  extraImages: string[]
}

const OCCASIONS = ["party", "college", "work", "casual", "formal", "trip", "sports", "date"]
const SEASONS = ["summer", "winter", "spring", "autumn", "all"]

const STATUS_LABELS: Record<Status, string> = {
  wardrobe: "Wardrobe",
  wishlist: "Wishlist",
  sold: "Sold",
  donated: "Donated",
}

function toDateInput(value: FashionItem["purchaseDate"] | undefined): string {
  if (!value) return ""
  if (typeof value === "string") return value.slice(0, 10)
  return value.toISOString().split("T")[0]
}

function initialState(item: FashionItem | undefined, defaultStatus: Status): FormState {
  if (!item) {
    return {
      status: defaultStatus,
      name: "",
      category: "",
      subcategory: "",
      brand: "",
      color: "",
      size: "",
      price: "",
      purchaseDate: "",
      expectedBudget: "",
      buyDeadline: "",
      condition: "good",
      occasion: [],
      season: [],
      tags: [],
      notes: "",
      isFavorite: false,
      link: "",
      imageUrl: "",
      extraImages: [],
    }
  }
  return {
    status: item.status || "wardrobe",
    name: item.name,
    category: item.category,
    subcategory: item.subcategory || "",
    brand: item.brand || "",
    color: item.color || "",
    size: item.size || "",
    price: item.price?.toString() || "",
    purchaseDate: toDateInput(item.purchaseDate),
    expectedBudget: item.metadata?.expectedBudget?.toString() || "",
    buyDeadline: item.metadata?.buyDeadline || "",
    condition: item.condition || "good",
    occasion: item.occasion || [],
    season: item.season || [],
    tags: item.tags || [],
    notes: item.notes || "",
    isFavorite: item.isFavorite || false,
    link: item.metadata?.buyingLink || "",
    imageUrl: item.imageUrl || "",
    extraImages: item.images?.filter((u) => u !== item.imageUrl) ?? [],
  }
}

/** True when the optional "More details" section has anything in it. */
function hasOptionalDetails(f: FormState): boolean {
  return Boolean(
    f.subcategory || f.notes || f.occasion.length || f.season.length || f.tags.length || f.expectedBudget || f.isFavorite
  )
}

interface FashionItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass an item to edit it; leave out to add a new one */
  item?: FashionItem
  /** Add mode: which tab the form starts on */
  defaultStatus?: "wardrobe" | "wishlist"
  /** Edit mode: called with the saved item */
  onUpdate?: (item: FashionItem) => void
}

/**
 * Compact add/edit form: paste a link or fill four essentials, with everything else under "More details".
 * Used by both AddFashionDialog and EditFashionDialog so they stay identical.
 */
export function FashionItemFormDialog({ open, onOpenChange, item, defaultStatus = "wardrobe", onUpdate }: FashionItemFormDialogProps) {
  const router = useRouter()
  const isEdit = Boolean(item)

  const [form, setForm] = useState<FormState>(() => initialState(item, defaultStatus))
  const [shopDetails, setShopDetails] = useState<Partial<FashionMetadata>>({})
  const [tagInput, setTagInput] = useState("")
  const [moreOpen, setMoreOpen] = useState(() => hasOptionalDetails(initialState(item, defaultStatus)))
  const [fetchNote, setFetchNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // What the shop lists for this product (from a fetched link, or saved on the item earlier). When present the
  // dropdowns offer only these; typing a different value is still allowed.
  const shopSizes: string[] = shopDetails.availableSizes ?? item?.metadata?.availableSizes ?? []
  const shopColors: string[] = shopDetails.availableColors ?? item?.metadata?.availableColors ?? []

  const profile = useFashionProfile()
  const sizeList = shopSizes.length ? shopSizes : sizeOptions(form.category)
  const availability = sizeAvailability(profile, form.category, shopSizes)
  // Pin the user's saved size when it is one of the choices
  const pinnedSize =
    availability.status === "available"
      ? [availability.match]
      : availability.status === "unknown" && availability.mySize && !shopSizes.length
        ? sizeList.filter((o) => sizeAvailability(profile, form.category, [o]).status === "available")
        : []

  const patch = (changes: Partial<FormState>) => setForm((prev) => ({ ...prev, ...changes }))

  // Start from a clean slate each time the dialog opens (or switches to another item)
  useEffect(() => {
    if (!open) return
    const fresh = initialState(item, defaultStatus)
    setForm(fresh)
    setShopDetails({})
    setTagInput("")
    setFetchNote(null)
    setMoreOpen(hasOptionalDetails(fresh))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id])

  const toggle = (key: "occasion" | "season", value: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter((v) => v !== value) : [...prev[key], value],
    }))

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) patch({ tags: [...form.tags, tag] })
    setTagInput("")
  }

  /** Fill the form from a fetched product. When editing, only empty fields are filled so nothing the user typed is lost. */
  const applyScrapedProduct = (data: ScrapedProduct) => {
    // Size is the one you own/want: prefill only when the product has a single size, otherwise offer them in the dropdown
    const listedSizes = Array.isArray(data.size) ? data.size : data.size ? [data.size] : []
    const sizeText = listedSizes.length === 1 ? listedSizes[0] : ""
    const filled: string[] = []
    const next: Partial<FormState> = {}
    const take = <K extends keyof FormState>(key: K, label: string, value: FormState[K] | undefined | "") => {
      if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) return
      if (isEdit && form[key] && !(Array.isArray(form[key]) && (form[key] as unknown[]).length === 0)) return
      next[key] = value as FormState[K]
      filled.push(label)
    }

    take("name", "name", data.product_name)
    take("category", "category", data.category)
    take("brand", "brand", data.brand)
    take("color", "color", data.color)
    take("size", "size", sizeText)
    take("price", "price", data.price.current)
    take("notes", "description", data.description)

    if (data.images.length > 0) {
      if (isEdit && form.imageUrl) {
        // keep the current main photo; offer the shop's photos as extras
        const extras = data.images.filter((u) => u !== form.imageUrl && !form.extraImages.includes(u))
        next.extraImages = [...form.extraImages, ...extras].slice(0, 12)
        if (extras.length) filled.push(`${extras.length} extra photo${extras.length > 1 ? "s" : ""}`)
      } else {
        next.imageUrl = data.images[0]
        next.extraImages = data.images.slice(1)
        filled.push(`${data.images.length} photo${data.images.length > 1 ? "s" : ""}`)
      }
    }

    patch(next)
    setShopDetails(productMetadata(data))
    const sizeHint = listedSizes.length > 1 ? ` · ${listedSizes.length} sizes available, pick yours` : ""
    setFetchNote(filled.length ? `Filled in: ${filled.join(", ")}${sizeHint}` : null)
    if (filled.includes("description")) setMoreOpen(true)
  }

  const makeMain = (url: string) => {
    setForm((prev) => ({
      ...prev,
      imageUrl: url,
      extraImages: prev.imageUrl ? prev.extraImages.map((u) => (u === url ? prev.imageUrl : u)) : prev.extraImages.filter((u) => u !== url),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // copy shop-hosted photos to our own storage before saving
      const [mainImage, ...savedExtras] = await persistImages([form.imageUrl, ...form.extraImages])
      const isWishlist = form.status === "wishlist"
      const existingMetadata: Record<string, unknown> = item?.metadata || {}

      const payload = {
        name: form.name,
        category: form.category,
        subcategory: form.subcategory || undefined,
        brand: form.brand || undefined,
        color: form.color || undefined,
        size: form.size || undefined,
        purchaseDate: form.purchaseDate || undefined,
        price: form.price ? Number.parseFloat(form.price) : undefined,
        imageUrl: mainImage || undefined,
        images: isEdit ? savedExtras : savedExtras.length > 0 ? savedExtras : undefined,
        notes: form.notes || undefined,
        status: form.status,
        tags: form.tags.length > 0 ? form.tags : undefined,
        isFavorite: form.isFavorite,
        occasion: form.occasion.length > 0 ? form.occasion : undefined,
        season: form.season.length > 0 ? form.season : undefined,
        condition: isWishlist ? undefined : form.condition || "good",
        metadata: {
          ...existingMetadata,
          ...shopDetails,
          buyingLink: form.link || undefined,
          expectedBudget: form.expectedBudget ? Number.parseFloat(form.expectedBudget) : undefined,
          buyDeadline: form.buyDeadline || undefined,
        },
      }

      const response = await fetch(isEdit ? `/api/fashion?id=${item!.id}` : "/api/fashion", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) throw new Error(`Failed to ${isEdit ? "update" : "create"} fashion item`)

      if (isEdit) {
        onUpdate?.(await response.json())
        toast.success("Item updated successfully")
      } else {
        toast.success(isWishlist ? "Added to wishlist" : "Added to wardrobe")
        router.refresh()
      }
      onOpenChange(false)
    } catch (error) {
      console.error("Error saving fashion item:", error)
      toast.error(isEdit ? "Failed to update item" : "Failed to create fashion item")
    } finally {
      setSaving(false)
    }
  }

  const isWishlist = form.status === "wishlist"
  const statusOptions: Status[] = isEdit ? ["wardrobe", "wishlist", "sold", "donated"] : ["wardrobe", "wishlist"]
  const submitLabel = saving ? "Saving…" : isEdit ? "Save changes" : isWishlist ? "Add to wishlist" : "Add to wardrobe"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[920px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0 sm:pr-8">
            <div className="space-y-1.5">
              <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update the details of this piece" : "Paste a product link, or just fill in the basics"}
              </DialogDescription>
            </div>
            <div className="inline-flex shrink-0 self-start rounded-lg bg-muted p-1" role="group" aria-label="Where this item lives">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={form.status === s}
                  onClick={() => patch({ status: s })}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    form.status === s ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </DialogHeader>

          <div className="grid gap-x-6 gap-y-5 py-4 md:grid-cols-[minmax(0,1fr)_300px] md:grid-rows-[auto_1fr]">
            {/* ── Link + essentials ── */}
            <div className="min-w-0 space-y-5 md:col-start-1 md:row-start-1">
              <div className="space-y-2 rounded-xl border bg-muted/30 p-3">
                <ProductLinkField
                  id="fashion-link"
                  prominent
                  label="Product link"
                  value={form.link}
                  onChange={(link) => patch({ link })}
                  onFetched={applyScrapedProduct}
                />
                <p className="text-xs text-muted-foreground">
                  {fetchNote ?? "Amazon, Flipkart, Myntra, Meesho or Ajio. We'll fill in the name, photos, price and more."}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fashion-name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fashion-name"
                    placeholder="e.g., Blue Denim Jacket"
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fashion-category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <ComboInput
                    id="fashion-category"
                    placeholder="Pick or type, e.g. Jacket"
                    value={form.category}
                    onChange={(category) => patch({ category })}
                    options={CATEGORY_OPTIONS}
                    capitalize
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fashion-brand">Brand</Label>
                    <Input id="fashion-brand" placeholder="e.g., Levi's" value={form.brand} onChange={(e) => patch({ brand: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fashion-color">Color</Label>
                    <ComboInput id="fashion-color" placeholder={shopColors.length ? `Pick a color (${shopColors.length} available)` : "Pick or type"} value={form.color} onChange={(color) => patch({ color })} options={shopColors.length ? shopColors : COLOR_OPTIONS} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fashion-price">Price (₹)</Label>
                    <Input
                      id="fashion-price"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={form.price}
                      onChange={(e) => patch({ price: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="fashion-size">Size</Label>
                    <ComboInput id="fashion-size" placeholder={shopSizes.length ? `Pick a size (${shopSizes.length} available)` : "Pick or type"} value={form.size} onChange={(size) => patch({ size })} options={sizeList} pinned={pinnedSize} pinnedLabel="Your size" />
                  {isWishlist && availability.status === "available" && (
                      <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Your size ({availability.mySize}) is available
                      </p>
                    )}
                    {isWishlist && availability.status === "unavailable" && (
                      <p className="flex items-start gap-1 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                        <span>Not available in your size ({availability.mySize})</span>
                      </p>
                    )}
                  </div>
                </div>

                {isWishlist ? (
                  <div className="grid gap-2 sm:max-w-[calc(50%-0.5rem)]">
                    <Label htmlFor="fashion-deadline">Buy by (optional)</Label>
                    <Input
                      id="fashion-deadline"
                      type="date"
                      value={form.buyDeadline}
                      onChange={(e) => patch({ buyDeadline: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2 sm:max-w-[calc(50%-0.5rem)]">
                    <Label htmlFor="fashion-purchase-date">Purchase date (optional)</Label>
                    <Input
                      id="fashion-purchase-date"
                      type="date"
                      value={form.purchaseDate}
                      onChange={(e) => patch({ purchaseDate: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Photos ── */}
            <div className="min-w-0 space-y-3 md:col-start-2 md:row-span-2 md:row-start-1 md:self-start">
              <FashionImagePreview
                inline
                src={form.imageUrl}
                extras={form.extraImages}
                onSelectExtra={makeMain}
                onRemoveExtra={(u) => patch({ extraImages: form.extraImages.filter((x) => x !== u) })}
                name={form.name}
                brand={form.brand}
                price={form.price}
              />
              <ImageUpload hidePreview compact value={form.imageUrl} onChange={(imageUrl) => patch({ imageUrl })} placeholder="…or paste an image URL" />
            </div>

            {/* ── Optional details ── */}
            <div className="min-w-0 md:col-start-1 md:row-start-2">
              <Collapsible open={moreOpen} onOpenChange={setMoreOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-xs font-bold uppercase tracking-widest hover:bg-muted/50"
                  >
                    <span>
                      More details <span className="font-medium normal-case tracking-normal text-muted-foreground">(optional)</span>
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="grid gap-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="fashion-subcategory">Subcategory</Label>
                      <Input
                        id="fashion-subcategory"
                        placeholder="e.g., Denim"
                        value={form.subcategory}
                        onChange={(e) => patch({ subcategory: e.target.value })}
                      />
                    </div>
                    {isWishlist ? (
                      <div className="grid gap-2">
                        <Label htmlFor="fashion-budget">Target budget (₹)</Label>
                        <Input
                          id="fashion-budget"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={form.expectedBudget}
                          onChange={(e) => patch({ expectedBudget: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        <Label htmlFor="fashion-condition">Condition</Label>
                        <Select value={form.condition} onValueChange={(condition) => patch({ condition })}>
                          <SelectTrigger id="fashion-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New ✨</SelectItem>
                            <SelectItem value="good">Good 👍</SelectItem>
                            <SelectItem value="fair">Fair 🆗</SelectItem>
                            <SelectItem value="needs_repair">Needs Repair 🛠️</SelectItem>
                            <SelectItem value="needs_wash">Needs Wash 🧺</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label>Occasion</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {OCCASIONS.map((o) => (
                        <Badge
                          key={o}
                          variant={form.occasion.includes(o) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => toggle("occasion", o)}
                        >
                          {o}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Season</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {SEASONS.map((s) => (
                        <Badge
                          key={s}
                          variant={form.season.includes(s) ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => toggle("season", s)}
                        >
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fashion-tags">Tags</Label>
                    <div className="flex gap-2">
                      <Input
                        id="fashion-tags"
                        placeholder="Add tag (e.g., casual, summer)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault()
                            addTag()
                          }
                        }}
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    {form.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {form.tags.map((tag) => (
                          <Badge key={tag} variant="secondary">
                            {tag}
                            <button
                              type="button"
                              aria-label={`Remove tag ${tag}`}
                              onClick={() => patch({ tags: form.tags.filter((t) => t !== tag) })}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="fashion-notes">Notes</Label>
                    <Textarea
                      id="fashion-notes"
                      placeholder="Add any additional notes…"
                      value={form.notes}
                      onChange={(e) => patch({ notes: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch id="fashion-favorite" checked={form.isFavorite} onCheckedChange={(isFavorite) => patch({ isFavorite })} />
                    <Label htmlFor="fashion-favorite" className="text-sm">
                      Mark as favorite ⭐
                    </Label>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
