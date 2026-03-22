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
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { SkincareProduct, BodyPart, SkincareStatus, RoutineTime } from "@/lib/types/skincare"

interface EditProductDialogProps {
  product: SkincareProduct
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (product: SkincareProduct) => void
}

export function EditProductDialog({ product, open, onOpenChange, onUpdated }: EditProductDialogProps) {
  const [productName, setProductName] = useState(product.productName)
  const [brand, setBrand] = useState(product.brand || "")
  const [category, setCategory] = useState(product.category)
  const [bodyPart, setBodyPart] = useState<BodyPart>(product.bodyPart)
  const [status, setStatus] = useState<SkincareStatus>(product.status)
  const [routineTime, setRoutineTime] = useState<RoutineTime | "">(product.routineTime || "")
  const [frequency, setFrequency] = useState(product.frequency || "")
  const [purchaseDate, setPurchaseDate] = useState(product.purchaseDate || "")
  const [expiryDate, setExpiryDate] = useState(product.expiryDate || "")
  const [price, setPrice] = useState(product.price?.toString() || "")
  const [rating, setRating] = useState(product.rating?.toString() || "")
  const [notes, setNotes] = useState(product.notes || "")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setProductName(product.productName)
      setBrand(product.brand || "")
      setCategory(product.category)
      setBodyPart(product.bodyPart)
      setStatus(product.status)
      setRoutineTime(product.routineTime || "")
      setFrequency(product.frequency || "")
      setPurchaseDate(product.purchaseDate || "")
      setExpiryDate(product.expiryDate || "")
      setPrice(product.price?.toString() || "")
      setRating(product.rating?.toString() || "")
      setNotes(product.notes || "")
    }
  }, [open, product])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch(`/api/skincare?id=${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          brand: brand || null,
          category,
          bodyPart,
          status,
          routineTime: routineTime || null,
          frequency: frequency || null,
          purchaseDate: purchaseDate || null,
          expiryDate: expiryDate || null,
          price: price ? Number.parseFloat(price) : null,
          rating: rating ? Number.parseInt(rating) : null,
          notes: notes || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      const updatedProduct = await response.json()
      toast.success("Product updated successfully")
      onUpdated(updatedProduct)
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error updating product:", error)
      toast.error("Failed to update product")
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Make changes to your body care product</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
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
                  placeholder="e.g., Serum, Cleanser, Shampoo"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-body-part">Body Part</Label>
                <Select value={bodyPart} onValueChange={(value: BodyPart) => setBodyPart(value)}>
                  <SelectTrigger id="edit-body-part">
                    <SelectValue placeholder="Select part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="face">Face</SelectItem>
                    <SelectItem value="hair">Hair</SelectItem>
                    <SelectItem value="body">Body</SelectItem>
                    <SelectItem value="oral">Oral</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select value={status} onValueChange={(value: SkincareStatus) => setStatus(value)}>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="need_to_buy">Need to Buy</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-routine-time">Routine Time</Label>
                <Select
                  value={routineTime}
                  onValueChange={(value: RoutineTime) => setRoutineTime(value)}
                >
                  <SelectTrigger id="edit-routine-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning</SelectItem>
                    <SelectItem value="evening">Evening</SelectItem>
                    <SelectItem value="both">Both AM/PM</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="optional">Optional</SelectItem>
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
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Any special instructions or thoughts..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
