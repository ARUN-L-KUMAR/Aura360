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
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { X } from "lucide-react"
import { ImageUpload } from "./image-upload"

interface AddFashionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ProductData {
  product_name: string
  brand: string
  category: string
  price: {
    current: string
    original?: string
    discount?: string
  }
  color: string
  size: string[] | string
  rating?: string
  reviews_count?: string
  description: string
  features?: string[]
  images: string[]
  buying_link: string
}

type FashionType = "buyed" | "need_to_buy"

export function AddFashionDialog({ open, onOpenChange }: AddFashionDialogProps) {
  const [itemName, setItemName] = useState("")
  const [category, setCategory] = useState("")
  const [brand, setBrand] = useState("")
  const [color, setColor] = useState("")
  const [size, setSize] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [price, setPrice] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [buyingLink, setBuyingLink] = useState("")
  const [notes, setNotes] = useState("")
  const [type, setType] = useState<FashionType>("buyed")
  const [status, setStatus] = useState("")
  const [occasion, setOccasion] = useState<string[]>([])
  const [season, setSeason] = useState<string[]>([])
  const [expectedBudget, setExpectedBudget] = useState("")
  const [buyDeadline, setBuyDeadline] = useState("")
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(false)
  const router = useRouter()

  // Function to extract product data from URL by fetching the actual page
  const extractProductData = async (url: string): Promise<ProductData | null> => {
    try {
      // Fetch the product page
      const response = await fetch(`/api/scrape-product?url=${encodeURIComponent(url)}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error("Error fetching product data:", error)
      throw error // Re-throw to be caught by caller
    }
  }

  const handleBuyingLinkChange = async (value: string) => {
    setBuyingLink(value)

    if (value && (value.includes('amazon.com') || value.includes('flipkart.com') || value.includes('myntra.com'))) {
      setFetchLoading(true)
      try {
        const data = await extractProductData(value)
        if (data) {
          setItemName(data.product_name || "")
          setCategory(data.category || "")
          setBrand(data.brand || "")
          setColor(data.color || "")
          setSize(Array.isArray(data.size) ? data.size.join(", ") : data.size || "")
          setPrice(data.price.current || "")
          setImageUrl(data.images[0] || "")
          setNotes(data.description || "")
        }
      } catch (error) {
        console.error("Error fetching product data:", error)
        // Show user-friendly error message
        alert(`Failed to fetch product data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setFetchLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
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
          imageUrl: imageUrl || undefined,
          notes: notes || undefined,
          status: type === "buyed" ? "wardrobe" : "wishlist",
          isFavorite,
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
    setBuyingLink("")
    setNotes("")
    setType("buyed")
    setStatus("")
    setOccasion([])
    setSeason([])
    setExpectedBudget("")
    setBuyDeadline("")
    setIsFavorite(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Fashion Item</DialogTitle>
            <DialogDescription>Add a new piece to your wardrobe or wishlist</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
              value={imageUrl}
              onChange={setImageUrl}
              label="Image Upload or URL"
              placeholder="https://example.com/image.jpg"
            />

            <div className="grid gap-2">
              <Label htmlFor="buying-link">Buying Link (Optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="buying-link"
                  type="url"
                  placeholder="https://example.com/buy"
                  value={buyingLink}
                  onChange={(e) => setBuyingLink(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleBuyingLinkChange(buyingLink)}
                  disabled={fetchLoading || !buyingLink}
                  className="px-4"
                >
                  {fetchLoading ? "Fetching..." : "Fetch"}
                </Button>
              </div>
              {fetchLoading && <p className="text-sm text-muted-foreground">Fetching product data...</p>}
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
                <Label htmlFor="status">Status (Optional)</Label>
                <Input
                  id="status"
                  placeholder="e.g., New, Worn, Needs Wash"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || fetchLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
