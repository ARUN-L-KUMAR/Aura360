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
import type { FashionItem } from "@/lib/types/fashion"

interface EditFashionDialogProps {
  item: FashionItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: FashionItem) => void
}

export function EditFashionDialog({ item, open, onOpenChange, onUpdate }: EditFashionDialogProps) {
  const [itemName, setItemName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [subcategory, setSubcategory] = useState(item.subcategory || "")
  const [brand, setBrand] = useState(item.brand || "")
  const [color, setColor] = useState(item.color || "")
  const [size, setSize] = useState(item.size || "")
  const [purchaseDate, setPurchaseDate] = useState(
    item.purchaseDate ? (typeof item.purchaseDate === 'string' ? item.purchaseDate : item.purchaseDate.toISOString().split('T')[0]) : ""
  )
  const [price, setPrice] = useState(item.price?.toString() || "")
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "")
  const [notes, setNotes] = useState(item.notes || "")
  const [status, setStatus] = useState<"wardrobe" | "wishlist" | "sold" | "donated">(item.status || "wardrobe")
  const [tags, setTags] = useState<string[]>(item.tags || [])
  const [tagInput, setTagInput] = useState("")
  const [isFavorite, setIsFavorite] = useState(item.isFavorite || false)
  const [occasion, setOccasion] = useState<string[]>([])
  const [season, setSeason] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setItemName(item.name)
    setCategory(item.category)
    setSubcategory(item.subcategory || "")
    setBrand(item.brand || "")
    setColor(item.color || "")
    setSize(item.size || "")
    setPurchaseDate(
      item.purchaseDate ? (typeof item.purchaseDate === 'string' ? item.purchaseDate : item.purchaseDate.toISOString().split('T')[0]) : ""
    )
    setPrice(item.price?.toString() || "")
    setImageUrl(item.imageUrl || "")
    setNotes(item.notes || "")
    setStatus(item.status || "wardrobe")
    setTags(item.tags || [])
    setIsFavorite(item.isFavorite || false)
    setOccasion((item.metadata?.occasion as string[]) || [])
    setSeason((item.metadata?.season as string[]) || [])
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
          subcategory: subcategory || undefined,
          brand: brand || undefined,
          color: color || undefined,
          size: size || undefined,
          purchaseDate: purchaseDate || undefined,
          price: price ? Number.parseFloat(price) : undefined,
          imageUrl: imageUrl || undefined,
          notes: notes || undefined,
          status,
          tags: tags.length > 0 ? tags : undefined,
          isFavorite,
          metadata: {
            occasion: occasion.length > 0 ? occasion : undefined,
            season: season.length > 0 ? season : undefined,
          },
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
      console.error("Error updating fashion item:", error)
      toast.error("Failed to update item")
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
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
            {/* Status Toggle */}
            <div className="grid gap-2">
              <Label>Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-status-toggle"
                  checked={status === "wardrobe"}
                  onCheckedChange={(checked) => setStatus(checked ? "wardrobe" : "wishlist")}
                />
                <Label htmlFor="edit-status-toggle" className="text-sm">
                  {status === "wardrobe" ? "In Wardrobe" : "In Wishlist"}
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
                <Label htmlFor="edit-subcategory">Subcategory</Label>
                <Input
                  id="edit-subcategory"
                  placeholder="e.g., Denim, Running"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  placeholder="e.g., Levi's"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-color">Color</Label>
                <Input
                  id="edit-color"
                  placeholder="e.g., Blue"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-size">Size</Label>
                <Input
                  id="edit-size"
                  placeholder="e.g., M, 32"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
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

            <div className="grid gap-2">
              <Label htmlFor="edit-purchase-date">Purchase Date</Label>
              <Input
                id="edit-purchase-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            <ImageUpload
              value={imageUrl}
              onChange={setImageUrl}
              label="Image Upload or URL"
              placeholder="https://example.com/image.jpg"
            />

            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-tags"
                  placeholder="Add tag (e.g., casual, summer)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag()
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
