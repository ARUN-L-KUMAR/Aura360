/**
 * LEGACY (unused): the original single-form "AddFashionDialog" kept for reference/rollback.
 * It is not imported anywhere; the app now uses the compact form built on ./fashion-item-form.
 *
 * To restore it, change the import:
 *   import { AddFashionDialog } from "./add-fashion-dialog"  →  import { LegacyAddFashionDialog as AddFashionDialog } from "./add-fashion-dialog.legacy"   (in add-fashion-button.tsx)
 */
"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X } from "lucide-react"
import { ImageUpload } from "./image-upload"
import { ProductLinkField } from "./product-link-field"
import { FashionImagePreview } from "./fashion-image-preview"
import type { FashionMetadata, ScrapedProduct } from "@/lib/types/fashion"
import { persistImages, productMetadata } from "@/lib/fashion/product-import"

type FashionType = "buyed" | "need_to_buy"

interface AddFashionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Which toggle position the form starts in: "buyed" = wardrobe, "need_to_buy" = wishlist */
  defaultType?: FashionType
}

export function LegacyAddFashionDialog({ open, onOpenChange, defaultType = "buyed" }: AddFashionDialogProps) {
  const [itemName, setItemName] = useState("")
  const [category, setCategory] = useState("")
  const [brand, setBrand] = useState("")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [price, setPrice] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [extraImages, setExtraImages] = useState<string[]>([])
  const [shopDetails, setShopDetails] = useState<Partial<FashionMetadata>>({})
  const [buyingLink, setBuyingLink] = useState("")
  const [notes, setNotes] = useState("")
  const [type, setType] = useState<FashionType>(defaultType)
  const [status, setStatus] = useState("")
  const [occasion, setOccasion] = useState<string[]>([])
  const [season, setSeason] = useState<string[]>([])
  const [expectedBudget, setExpectedBudget] = useState("")
  const [buyDeadline, setBuyDeadline] = useState("")
  const [isFavorite, setIsFavorite] = useState(false)
  const [condition, setCondition] = useState("good")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Fill the form from scraped product details (only overwrites a field when the shop provided a value)
  const applyScrapedProduct = (data: ScrapedProduct) => {
    if (data.product_name) setItemName(data.product_name)
    if (data.category) setCategory(data.category)
    if (data.brand) setBrand(data.brand)
    if (data.color) setColor(data.color)
    const sizeText = Array.isArray(data.size) ? data.size.join(", ") : data.size
    if (sizeText) setSize(sizeText)
    if (data.images[0]) {
      setImageUrl(data.images[0])
      setExtraImages(data.images.slice(1))
    }
    setShopDetails(productMetadata(data))
    if (data.description) setNotes(data.description)
    if (data.price.current) {
      setPrice(data.price.current)
      setExpectedBudget(data.price.current)
    }
  }

  const makeMain = (url: string) => {
    if (imageUrl) setExtraImages((prev) => prev.map((u) => (u === url ? imageUrl : u)))
    else setExtraImages((prev) => prev.filter((u) => u !== url))
    setImageUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // copy shop-hosted photos to our own storage before saving
      const [mainImage, ...savedExtras] = await persistImages([imageUrl, ...extraImages])

      const response = await fetch("/api/fashion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName,
          category,
          brand: brand || undefined,
          color: color || undefined,
          size: size || undefined,
          purchaseDate: purchaseDate || undefined,
          price: price ? Number.parseFloat(price) : undefined,
          imageUrl: mainImage || undefined,
          images: savedExtras.length > 0 ? savedExtras : undefined,
          notes: notes || undefined,
          status: type === "buyed" ? "wardrobe" : "wishlist",
          isFavorite,
          occasion: occasion.length > 0 ? occasion : undefined,
          season: season.length > 0 ? season : undefined,
          condition: type === "buyed" ? condition : undefined,
          metadata: {
            ...shopDetails,
            buyingLink: buyingLink || undefined,
            expectedBudget: type === "need_to_buy" && expectedBudget ? Number.parseFloat(expectedBudget) : undefined,
            buyDeadline: type === "need_to_buy" ? buyDeadline || undefined : undefined,
          },
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create fashion item")
      }

      toast.success("Fashion item added successfully")
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error creating fashion item:", error)
      toast.error("Failed to create fashion item")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setItemName("")
    setCategory("")
    setBrand("")
    setColor("")
    setSize("")
    setPurchaseDate("")
    setPrice("")
    setImageUrl("")
    setExtraImages([])
    setShopDetails({})
    setBuyingLink("")
    setNotes("")
    setType(defaultType)
    setStatus("")
    setOccasion([])
    setSeason([])
    setExpectedBudget("")
    setBuyDeadline("")
    setIsFavorite(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[920px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Fashion Item</DialogTitle>
            <DialogDescription>Add a new piece to your wardrobe or wishlist</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4 md:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid gap-4 min-w-0">
            {/* Type Toggle */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="type-toggle"
                  checked={type === "buyed"}
                  onCheckedChange={(checked) => setType(checked ? "buyed" : "need_to_buy")}
                />
                <Label htmlFor="type-toggle" className="text-sm">
                  {type === "buyed" ? "Already Bought (Wardrobe)" : "Need to Buy (Wishlist)"}
                </Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-name">Item Name</Label>
              <Input
                id="item-name"
                placeholder="e.g., Blue Denim Jacket"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Jacket, Shoes"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="e.g., Levi's" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Input id="color" placeholder="e.g., Blue" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="size">Size</Label>
                <Input id="size" placeholder="e.g., M, 32" value={size} onChange={(e) => setSize(e.target.value)} />
              </div>
            </div>

            {type === "buyed" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="purchase-date">Purchase Date</Label>
                  <Input
                    id="purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="expected-budget">Expected Budget</Label>
                  <Input
                    id="expected-budget"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expectedBudget}
                    onChange={(e) => setExpectedBudget(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="buy-deadline">Buy Deadline</Label>
                  <Input
                    id="buy-deadline"
                    type="date"
                    value={buyDeadline}
                    onChange={(e) => setBuyDeadline(e.target.value)}
                  />
                </div>
              </div>
            )}

            <ImageUpload
              hidePreview
              value={imageUrl}
              onChange={setImageUrl}
              label="Image Upload or URL"
              placeholder="https://example.com/image.jpg"
            />

            <ProductLinkField
              id="buying-link"
              value={buyingLink}
              onChange={setBuyingLink}
              onFetched={applyScrapedProduct}
            />

            {/* Occasion and Season */}
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Occasion (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {["party", "college", "work", "casual", "formal", "trip", "sports", "date"].map((occ) => (
                    <Badge
                      key={occ}
                      variant={occasion.includes(occ) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        setOccasion(prev =>
                          prev.includes(occ)
                            ? prev.filter(o => o !== occ)
                            : [...prev, occ]
                        )
                      }}
                    >
                      {occ}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Season (Optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {["summer", "winter", "spring", "autumn", "all"].map((seas) => (
                    <Badge
                      key={seas}
                      variant={season.includes(seas) ? "default" : "outline"}
                      className="cursor-pointer capitalize"
                      onClick={() => {
                        setSeason(prev =>
                          prev.includes(seas)
                            ? prev.filter(s => s !== seas)
                            : [...prev, seas]
                        )
                      }}
                    >
                      {seas}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {type === "buyed" && (
              <div className="grid gap-2">
                <Label htmlFor="status">Condition</Label>
                <Select value={condition} onValueChange={setCondition}>
                  <SelectTrigger id="status">
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

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="favorite"
                checked={isFavorite}
                onCheckedChange={setIsFavorite}
              />
              <Label htmlFor="favorite" className="text-sm">Mark as Favorite ⭐</Label>
            </div>
          </div>
          <FashionImagePreview src={imageUrl} extras={extraImages} onSelectExtra={makeMain} onRemoveExtra={(u) => setExtraImages((prev) => prev.filter((x) => x !== u))} name={itemName} brand={brand} price={type === "buyed" ? price : expectedBudget} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
