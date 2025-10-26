"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Star } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditProductDialog } from "./edit-product-dialog"

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
    const supabase = createClient()

    const { error } = await supabase.from("skincare").delete().eq("id", product.id)

    if (error) {
      console.error("[v0] Error deleting skincare product:", error)
      alert("Failed to delete product")
    } else {
      onDelete(product.id)
    }
    setIsDeleting(false)
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-medium truncate">{product.product_name}</p>
            {product.routine_time && (
              <Badge variant="secondary" className="capitalize">
                {product.routine_time}
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
          {product.expiry_date && (
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
