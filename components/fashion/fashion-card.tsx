"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Shirt, Star, ExternalLink } from "lucide-react"
import { useState } from "react"
import { EditFashionDialog } from "./edit-fashion-dialog"
import type { FashionItem } from "@/lib/types/fashion"

interface FashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

export function FashionCard({ item, onDelete, onUpdate }: FashionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const buyingLink = item.metadata?.buyingLink
  const condition = item.metadata?.condition

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete item")
      }

      onDelete(item.id)
    } catch (error: any) {
      console.error("[v0] Error deleting fashion item:", error)
      alert(error.message || "Failed to delete item")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Card className="group relative backdrop-blur-sm bg-card/80 border-border/50 transition-all overflow-hidden">
        <CardHeader className="p-0">
          {item.imageUrl ? (
            <div className="aspect-square w-full overflow-hidden bg-muted relative">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                  target.className = "w-full h-full object-cover opacity-50";
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-secondary flex items-center justify-center border-b">
              <Shirt className="w-16 h-16 text-muted-foreground/40" />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg line-clamp-1 tracking-tight">{item.name}</h3>
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
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditFashionDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
