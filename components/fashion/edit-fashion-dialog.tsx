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
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { toast } from "sonner"
import { ImageUpload } from "./image-upload"

type FashionType = "buyed" | "need_to_buy"

interface FashionItem {
  id: string
  user_id: string
  item_name: string
  category: string
  brand: string | null
  color: string | null
  size: string | null
  purchase_date: string | null
  price: number | null
  image_url: string | null
  buying_link: string | null
  notes: string | null
  type: "buyed" | "need_to_buy"
  status: string | null
  occasion: string[] | null
  season: string[] | null
  expected_budget: number | null
  buy_deadline: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

interface EditFashionDialogProps {
  item: FashionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: FashionItem) => void
}

export function EditFashionDialog({ item, open, onOpenChange, onUpdate }: EditFashionDialogProps) {
  const [itemName, setItemName] = useState(item.item_name)
  const [category, setCategory] = useState(item.category)
  const [brand, setBrand] = useState(item.brand || "")
  const [color, setColor] = useState(item.color || "")
  const [size, setSize] = useState(item.size || "")
  const [purchaseDate, setPurchaseDate] = useState(item.purchase_date || "")
  const [price, setPrice] = useState(item.price?.toString() || "")
  const [imageUrl, setImageUrl] = useState(item.image_url || "")
  const [buyingLink, setBuyingLink] = useState(item.buying_link || "")
  const [notes, setNotes] = useState(item.notes || "")
  const [type, setType] = useState<FashionType>(item.type || "buyed")
  const [status, setStatus] = useState(item.status || "")
  const [occasion, setOccasion] = useState<string[]>(item.occasion || [])
  const [season, setSeason] = useState<string[]>(item.season || [])
  const [expectedBudget, setExpectedBudget] = useState(item.expected_budget?.toString() || "")
  const [buyDeadline, setBuyDeadline] = useState(item.buy_deadline || "")
  const [isFavorite, setIsFavorite] = useState(item.is_favorite || false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setItemName(item.item_name)
    setCategory(item.category)
    setBrand(item.brand || "")
    setColor(item.color || "")
    setSize(item.size || "")
    setPurchaseDate(item.purchase_date || "")
    setPrice(item.price?.toString() || "")
    setImageUrl(item.image_url || "")
    setBuyingLink(item.buying_link || "")
    setNotes(item.notes || "")
    setType(item.type || "buyed")
    setStatus(item.status || "")
    setOccasion(item.occasion || [])
    setSeason(item.season || [])
    setExpectedBudget(item.expected_budget?.toString() || "")
    setBuyDeadline(item.buy_deadline || "")
    setIsFavorite(item.is_favorite || false)
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName,
          category,
          brand: brand || null,
          color: color || null,
          size: size || null,
          purchaseDate: purchaseDate || null,
          price: price ? Number.parseFloat(price) : null,
          imageUrl: imageUrl || null,
          buyingLink: buyingLink || null,
          notes: notes || null,
          type,
          status: status || null,
          occasion: occasion.length > 0 ? occasion : null,
          season: season.length > 0 ? season : null,
          expectedBudget: expectedBudget ? Number.parseFloat(expectedBudget) : null,
          buyDeadline: buyDeadline || null,
          isFavorite: isFavorite,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update item")
      }

      const data = await response.json()
      toast.success("Item updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("[v0] Error updating fashion item:", error)
      toast.error("Failed to update item")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Fashion Item</DialogTitle>
            <DialogDescription>Make changes to your wardrobe or wishlist item</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Type Toggle */}
            <div className="grid gap-2">
              <Label>Type</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-type-toggle"
                  checked={type === "buyed"}
                  onCheckedChange={(checked) => setType(checked ? "buyed" : "need_to_buy")}
                />
                <Label htmlFor="edit-type-toggle" className="text-sm">
                  {type === "buyed" ? "Already Bought (Wardrobe)" : "Need to Buy (Wishlist)"}
                </Label>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-item-name">Item Name</Label>
              <Input
                id="edit-item-name"
                placeholder="e.g., Blue Denim Jacket"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  placeholder="e.g., Jacket, Shoes"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  placeholder="e.g., Levi's"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  placeholder="e.g., Blue"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input
                  id="edit-size"
                  placeholder="e.g., M, 32"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>
            </div>

            {type === "buyed" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-purchase-date">Purchase Date</Label>
                  <Input
                    id="edit-purchase-date"
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-price">Price</Label>
                  <Input
                    id="edit-price"
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
                  <Label htmlFor="edit-expected-budget">Expected Budget</Label>
                  <Input
                    id="edit-expected-budget"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expectedBudget}
                    onChange={(e) => setExpectedBudget(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-buy-deadline">Buy Deadline</Label>
                  <Input
                    id="edit-buy-deadline"
                    type="date"
                    value={buyDeadline}
                    onChange={(e) => setBuyDeadline(e.target.value)}
                  />
                </div>
              </div>
            )}

            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Image Upload or URL"
              placeholder="https://example.com/image.jpg"
            />

            <div className="grid gap-2">
              <Label htmlFor="edit-buying-link">Buying Link (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-buying-link"
                  type="url"
                  placeholder="https://example.com/buy"
                  value={buyingLink}
                  onChange={(e) => setBuyingLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (buyingLink && (buyingLink.includes('amazon.com') || buyingLink.includes('flipkart.com') || buyingLink.includes('myntra.com'))) {
                      // Simple fetch logic for edit dialog
                      setIsLoading(true)
                      fetch(`/api/scrape-product?url=${encodeURIComponent(buyingLink)}`)
                        .then(res => res.json())
                        .then(data => {
                          if (data.product_name) setItemName(data.product_name)
                          if (data.category) setCategory(data.category)
                          if (data.brand) setBrand(data.brand)
                          if (data.color) setColor(data.color)
                          if (data.size) setSize(Array.isArray(data.size) ? data.size.join(", ") : data.size)
                          if (data.price?.current) setPrice(data.price.current.replace(/[^\d.]/g, ''))
                          if (data.images?.[0]) setImageUrl(data.images[0])
                          if (data.description) setNotes(data.description)
                        })
                        .catch(error => {
                          console.error("Error fetching product data:", error)
                          alert(`Failed to fetch product data: ${error.message || 'Unknown error'}`)
                        })
                        .finally(() => setIsLoading(false))
                    }
                  }}
                  disabled={isLoading || !buyingLink}
                  className="px-4"
                >
                  {isLoading ? "Fetching..." : "Fetch"}
                </Button>
              </div>
            </div>

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
                <Label htmlFor="edit-status">Status (Optional)</Label>
                <Input
                  id="edit-status"
                  placeholder="e.g., New, Worn, Needs Wash"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="edit-favorite"
                checked={isFavorite}
                onCheckedChange={setIsFavorite}
              />
              <Label htmlFor="edit-favorite" className="text-sm">Mark as Favorite ⭐</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
