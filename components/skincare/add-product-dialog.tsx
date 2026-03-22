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
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { BodyPart, SkincareStatus, RoutineTime } from "@/lib/types/skincare"

interface AddProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const [productName, setProductName] = useState("")
  const [brand, setBrand] = useState("")
  const [category, setCategory] = useState("")
  const [bodyPart, setBodyPart] = useState<BodyPart>("face")
  const [status, setStatus] = useState<SkincareStatus>("owned")
  const [routineTime, setRoutineTime] = useState<RoutineTime | "">("")
  const [frequency, setFrequency] = useState("")
  const [purchaseDate, setPurchaseDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [price, setPrice] = useState("")
  const [rating, setRating] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/skincare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          brand: brand || undefined,
          category,
          bodyPart,
          status,
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
        throw new Error("Failed to create product")
      }

      toast.success("Product added successfully")
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error creating product:", error)
      toast.error("Failed to create product")
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setProductName("")
    setBrand("")
    setCategory("")
    setBodyPart("face")
    setStatus("owned")
    setRoutineTime("")
    setFrequency("")
    setPurchaseDate("")
    setExpiryDate("")
    setPrice("")
    setRating("")
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Add a new item to your body care inventory</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                placeholder="e.g., Hydrating Serum"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" placeholder="e.g., CeraVe" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  placeholder="e.g., Serum, Cleanser, Shampoo"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="body-part">Body Part</Label>
                <Select value={bodyPart} onValueChange={(value: BodyPart) => setBodyPart(value)}>
                  <SelectTrigger id="body-part">
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
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(value: SkincareStatus) => setStatus(value)}>
                  <SelectTrigger id="status">
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
                <Label htmlFor="routine-time">Routine Time</Label>
                <Select
                  value={routineTime}
                  onValueChange={(value: RoutineTime) => setRoutineTime(value)}
                >
                  <SelectTrigger id="routine-time">
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
                <Label htmlFor="frequency">Frequency</Label>
                <Input
                  id="frequency"
                  placeholder="e.g., Daily, 2x/week"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </div>
            </div>

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
                <Label htmlFor="expiry-date">Expiry Date</Label>
                <Input
                  id="expiry-date"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
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
              <div className="grid gap-2">
                <Label htmlFor="rating">Rating (1-5)</Label>
                <Input
                  id="rating"
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
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
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
              {isLoading ? "Adding..." : "Add Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
