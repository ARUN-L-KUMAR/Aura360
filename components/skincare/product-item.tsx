"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Star, MoreVertical, ExternalLink } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditProductDialog } from "./edit-product-dialog"
import { SkincareProduct } from "@/lib/types/skincare"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProductItemProps {
  product: SkincareProduct
  onDeleted: (productId: string) => void
  onUpdated: (product: SkincareProduct) => void
  isTableRow?: boolean
}

export function ProductItem({ product, onDeleted, onUpdated, isTableRow }: ProductItemProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this product?")) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/skincare?id=${product.id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete product")

      toast.success("Product deleted")
      onDeleted(product.id)
    } catch (error) { 
      console.error("Error deleting product:", error)
      toast.error("Failed to delete product")
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "owned":
        return <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400">Owned</Badge>
      case "need_to_buy":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400">Need to Buy</Badge>
      case "finished":
        return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-400">Finished</Badge>
      default:
        return null
    }
  }

  const getBodyPartBadge = (part: string) => {
    return <Badge variant="outline" className="capitalize">{part}</Badge>
  }

  if (isTableRow) {
    return (
      <TableRow className="group">
        <TableCell className="font-medium py-3 px-4">
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm truncate max-w-[120px] sm:max-w-none">{product.productName}</span>
            {product.notes && <span className="text-[10px] text-muted-foreground line-clamp-1">{product.notes}</span>}
          </div>
        </TableCell>
        <TableCell className="capitalize text-muted-foreground text-[10px] sm:text-sm py-3 px-4">{product.category}</TableCell>
        <TableCell className="py-3 px-4">{getBodyPartBadge(product.bodyPart)}</TableCell>
        <TableCell className="py-3 px-4">{getStatusBadge(product.status)}</TableCell>
        <TableCell className="text-muted-foreground text-[10px] sm:text-sm py-3 px-4 truncate max-w-[80px] sm:max-w-none">{product.brand || "-"}</TableCell>
        <TableCell className="py-3 px-4">
          {product.routineTime ? (
            <Badge variant="secondary" className="capitalize bg-slate-100 dark:bg-slate-800 text-[10px]">
              {product.routineTime}
            </Badge>
          ) : (
            "-"
          )}
        </TableCell>
        <TableCell className="text-right py-3 px-4">
          <div className="flex justify-end gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={handleDelete} disabled={isDeleting}>
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </div>
          <EditProductDialog
            product={product as any}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onUpdated={onUpdated}
          />
        </TableCell>
      </TableRow>
    )
  }

  return (
    <div className="group relative flex flex-col p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-2 sm:mb-3">
        <div className="space-y-0.5 sm:space-y-1 overflow-hidden">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h3 className="font-semibold leading-tight text-sm sm:text-base truncate">{product.productName}</h3>
            {product.rating && (
              <div className="flex items-center text-yellow-500 flex-shrink-0">
                <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-current" />
                <span className="text-[10px] sm:text-xs ml-0.5 font-medium">{product.rating}</span>
              </div>
            )}
          </div>
          <p className="text-[10px] sm:text-sm text-muted-foreground truncate">
            {product.brand} • <span className="capitalize">{product.category}</span>
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 -mr-1 sm:-mr-2">
              <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {getBodyPartBadge(product.bodyPart)}
        {getStatusBadge(product.status)}
        {product.routineTime && (
          <Badge variant="secondary" className="capitalize text-[10px]">
            {product.routineTime}
          </Badge>
        )}
      </div>

      {product.expiryDate && (
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3 flex items-center">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 mr-1.5 sm:mr-2" />
          Expires: {new Date(product.expiryDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
        </p>
      )}

      {product.notes && (
        <p className="text-[11px] sm:text-sm text-muted-foreground line-clamp-2 italic mb-3 sm:mb-4 leading-relaxed">
          "{product.notes}"
        </p>
      )}

      <div className="mt-auto pt-3 sm:pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
        <span className="text-xs sm:text-sm font-semibold">
          {product.price ? `$${product.price}` : "—"}
        </span>
        <Button variant="ghost" size="sm" className="h-7 sm:h-8 text-[10px] sm:text-xs font-medium px-2 sm:px-3">
          View Details
        </Button>
      </div>

      <EditProductDialog
        product={product as any}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onUpdated={onUpdated}
      />
    </div>
  )
}
