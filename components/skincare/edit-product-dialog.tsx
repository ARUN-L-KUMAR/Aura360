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
import { createClient } from "@/lib/supabase/client"

interface SkincareProduct {
  id: string
  user_id: string
  product_name: string
  brand: string | null
  category: string
  routine_time: "morning" | "evening" | "both" | null
  frequency: string | null
  purchase_date: string | null
  expiry_date: string | null
  price: number | null
  rating: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface EditProductDialogProps {
  product: SkincareProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (product: SkincareProduct) => void
}

export function EditProductDialog({ product, open, onOpenChange, onUpdate }: EditProductDialogProps) {
  const [productName, setProductName] = useState(product.product_name)
  const [brand, setBrand] = useState(product.brand || "")
  const [category, setCategory] = useState(product.category)
  const [routineTime, setRoutineTime] = useState<"morning" | "evening" | "both" | "">(product.routine_time || "")
  const [frequency, setFrequency] = useState(product.frequency || "")
  const [purchaseDate, setPurchaseDate] = useState(product.purchase_date || "")
  const [expiryDate, setExpiryDate] = useState(product.expiry_date || "")
  const [price, setPrice] = useState(product.price?.toString() || "")
  const [rating, setRating] = useState(product.rating?.toString() || "")
  const [notes, setNotes] = useState(product.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setProductName(product.product_name)
    setBrand(product.brand || "")
    setCategory(product.category)
    setRoutineTime(product.routine_time || "")
    setFrequency(product.frequency || "")
    setPurchaseDate(product.purchase_date || "")
    setExpiryDate(product.expiry_date || "")
    setPrice(product.price?.toString() || "")
    setRating(product.rating?.toString() || "")
    setNotes(product.notes || "")
  }, [product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("skincare")
      .update({
        product_name: productName,
        brand: brand || null,
        category,
        routine_time: routineTime || null,
        frequency: frequency || null,
        purchase_date: purchaseDate || null,
        expiry_date: expiryDate || null,
        price: price ? Number.parseFloat(price) : null,
        rating: rating ? Number.parseInt(rating) : null,
        notes: notes || null,
      })
      .eq("id", product.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating skincare product:", error)
      alert("Failed to update product")
    } else if (data) {
      onUpdate(data)
      onOpenChange(false)
    }

    setIsLoading(false)
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
