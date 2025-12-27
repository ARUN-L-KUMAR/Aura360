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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface SkincareProduct {
  id: string
  userId: string
  productName: string
  brand: string | null
  category: string
  routineTime: "morning" | "evening" | "both" | null
  frequency: string | null
  purchaseDate: string | null
  expiryDate: string | null
  price: number | null
  rating: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface EditProductDialogProps {
  product: SkincareProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (product: SkincareProduct) => void
}

export function EditProductDialog({ product, open, onOpenChange, onUpdate }: EditProductDialogProps) {
  const [productName, setProductName] = useState(product.productName)
  const [brand, setBrand] = useState(product.brand || "")
  const [category, setCategory] = useState(product.category)
  const [routineTime, setRoutineTime] = useState<"morning" | "evening" | "both" | "">(product.routineTime || "")
  const [frequency, setFrequency] = useState(product.frequency || "")
  const [purchaseDate, setPurchaseDate] = useState(product.purchaseDate || "")
  const [expiryDate, setExpiryDate] = useState(product.expiryDate || "")
  const [price, setPrice] = useState(product.price?.toString() || "")
  const [rating, setRating] = useState(product.rating?.toString() || "")
  const [notes, setNotes] = useState(product.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setProductName(product.productName)
    setBrand(product.brand || "")
    setCategory(product.category)
    setRoutineTime(product.routineTime || "")
    setFrequency(product.frequency || "")
    setPurchaseDate(product.purchaseDate || "")
    setExpiryDate(product.expiryDate || "")
    setPrice(product.price?.toString() || "")
    setRating(product.rating?.toString() || "")
    setNotes(product.notes || "")
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/skincare?id=${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          brand: brand || undefined,
          category,
          routineTime: routineTime || undefined,
          frequency: frequency || undefined,
          purchaseDate: purchaseDate || undefined,
          expiryDate: expiryDate || undefined,
          price: price ? Number.parseFloat(price) : undefined,
          rating: rating ? Number.parseInt(rating) : undefined,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update skincare product")
      }

      const data = await response.json()
      toast.success("Product updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating skincare product:", error)
      toast.error("Failed to update product")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Skincare Product</DialogTitle>
            <DialogDescription>Make changes to your skincare product</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-product-name">Product Name</Label>
              <Input
                id="edit-product-name"
                placeholder="e.g., Hydrating Serum"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-brand">Brand</Label>
                <Input
                  id="edit-brand"
                  placeholder="e.g., CeraVe"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-category">Category</Label>
                <Input
                  id="edit-category"
                  placeholder="e.g., Serum, Cleanser"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-routine-time">Routine Time</Label>
                <Select
                  value={routineTime}
                  onValueChange={(value: "morning" | "evening" | "both") => setRoutineTime(value)}
                >
                  <SelectTrigger id="edit-routine-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-frequency">Frequency</Label>
                <Input
                  id="edit-frequency"
                  placeholder="e.g., Daily, 2x/week"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </div>
            </div>

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
                <Label htmlFor="edit-expiry-date">Expiry Date</Label>
                <Input
                  id="edit-expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="edit-rating">Rating (1-5)</Label>
                <Input
                  id="edit-rating"
                  type="number"
                  min="1"
                  max="5"
                  placeholder="5"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
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
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-rose-600 hover:bg-rose-700">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
