"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Shirt, Star, ExternalLink, Images } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { costPerWear } from "@/lib/fashion/wear-stats"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { EditFashionDialog } from "./edit-fashion-dialog"
import { FashionItemDetailDialog } from "./fashion-item-detail-dialog"
import { galleryOf } from "@/lib/fashion/product-import"
import { sizeAvailability } from "@/lib/fashion/size-match"
import { useFashionProfile } from "./use-fashion-profile"
import type { FashionItem } from "@/lib/types/fashion"

interface FashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

export function FashionCard({ item, onDelete, onUpdate }: FashionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const photoCount = galleryOf(item).length
  const profile = useFashionProfile()
  const availableSizes = Array.isArray(item.metadata?.availableSizes) ? (item.metadata!.availableSizes as string[]) : []
  const sizeFlag = item.status === "wishlist" ? sizeAvailability(profile, item.category, availableSizes) : null
  const buyingLink = item.metadata?.buyingLink
  const condition = item.metadata?.condition

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete item")
      }

      setShowDeleteDialog(false)
      toast.success(`${item.name} deleted`)
      onDelete(item.id)
    } catch (error: any) {
      console.error("Error deleting fashion item:", error)
      toast.error(error.message || "Failed to delete item")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="group relative backdrop-blur-sm bg-card/80 border-border transition-all overflow-hidden">
        <CardHeader className="p-0">
          {item.imageUrl ? (
            <div
              role="button"
              tabIndex={0}
              aria-label={`View details for ${item.name}`}
              onClick={() => setShowDetail(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setShowDetail(true)
                }
              }}
              className="aspect-[3/4] w-full overflow-hidden bg-muted relative cursor-pointer"
            >
              {sizeFlag?.status === "unavailable" && (
                <span
                  className="absolute bottom-2 left-2 z-10 rounded-full bg-amber-500/95 px-2 py-0.5 text-[10px] font-bold text-white shadow"
                  title={`Not available in your size (${sizeFlag.mySize}). Listed: ${availableSizes.join(", ")}`}
                >
                  Size {sizeFlag.mySize} unavailable
                </span>
              )}
              {photoCount > 1 && (
                <span className="absolute bottom-2 right-2 z-10 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-bold shadow">
                  <Images className="h-3 w-3" />
                  {photoCount}
                </span>
              )}
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-[1.02]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                  target.className = "w-full h-full object-cover opacity-50";
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              aria-label={`View details for ${item.name}`}
              onClick={() => setShowDetail(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setShowDetail(true)
                }
              }}
              className="aspect-[3/4] w-full bg-secondary flex items-center justify-center border-b cursor-pointer"
            >
              <Shirt className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg line-clamp-1 tracking-tight cursor-pointer hover:underline" onClick={() => setShowDetail(true)}>{item.name}</h3>
              {item.isFavorite && <Star className="w-4 h-4 text-foreground fill-current" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border bg-secondary text-foreground">
                {item.category}
              </Badge>
              {item.color && (
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                  {item.color}
                </Badge>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1 font-medium">
            {item.brand && <p>Brand: {item.brand}</p>}
            {item.size && <p>Size: {item.size}</p>}
            {condition && <p>Condition: {condition}</p>}
            {item.status === "wardrobe" && (
              <p>
                Worn {item.wearCount ?? 0}×
                {costPerWear(item) !== null && ` · ₹${costPerWear(item)!.toFixed(0)}/wear`}
              </p>
            )}
            {item.price && <p className="font-bold text-lg text-foreground mt-2">₹{Number(item.price).toFixed(2)}</p>}
          </div>

          {buyingLink && (
            <Button asChild variant="outline" size="sm" className="h-8 w-full justify-center text-xs font-bold uppercase tracking-widest">
              <a href={buyingLink} target="_blank" rel="noreferrer">
                <ExternalLink className="h-3 w-3 mr-2" />
                Buy Item
              </a>
            </Button>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
              onClick={() => setShowDeleteDialog(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {item.name}?</AlertDialogTitle>
            <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FashionItemDetailDialog
        item={item}
        open={showDetail}
        onOpenChange={setShowDetail}
        onEdit={() => setShowEditDialog(true)}
      />

      <EditFashionDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
