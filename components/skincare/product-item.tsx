"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Star } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditProductDialog } from "./edit-product-dialog"

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

interface ProductItemProps {
  product: SkincareProduct
  onDelete: (productId: string) => void
  onUpdate: (product: SkincareProduct) => void
}

export function ProductItem({ product, onDelete, onUpdate }: ProductItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/skincare?id=${product.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete skincare product")
      }

      toast.success("Product deleted successfully")
      onDelete(product.id)
    } catch (error) {
      console.error("Error deleting skincare product:", error)
      toast.error("Failed to delete product")
    }

    setIsDeleting(false)
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{product.productName}</p>
            {product.routineTime && (
              <Badge variant="secondary" className="capitalize">
                {product.routineTime}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {product.brand && <span>{product.brand}</span>}
            <span>•</span>
            <span>{product.category}</span>
            {product.rating && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  {product.rating}/5
                </span>
              </>
            )}
          </div>
          {product.expiryDate && (
            <p className="text-xs text-muted-foreground mt-1">
              Expires: {new Date(product.expiry_date).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditProductDialog product={product} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
