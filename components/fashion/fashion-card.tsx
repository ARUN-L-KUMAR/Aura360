"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Shirt, Star } from "lucide-react"
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
      <Card className="group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all overflow-hidden">
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
            <div className="aspect-square w-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Shirt className="w-16 h-16 text-indigo-400 dark:text-indigo-600" />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg line-clamp-1">{item.name}</h3>
              {item.isFavorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs capitalize">
                {item.category}
              </Badge>
              {item.color && (
                <Badge variant="outline" className="text-xs">
                  {item.color}
                </Badge>
              )}
              {item.subcategory && (
                <Badge variant="outline" className="text-xs capitalize">
                  {item.subcategory}
                </Badge>
              )}
            </div>
            {item.tags && item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs capitalize">
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.tags.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {item.brand && <p>Brand: {item.brand}</p>}
            {item.size && <p>Size: {item.size}</p>}
            {item.price && <p className="font-medium text-foreground">₹{Number(item.price).toFixed(2)}</p>}
            {item.wearCount !== null && item.wearCount !== undefined && (
              <p>Worn: {item.wearCount} {item.wearCount === 1 ? 'time' : 'times'}</p>
            )}
          </div>

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
