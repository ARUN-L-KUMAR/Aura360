"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, ExternalLink, Star } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditSavedItemDialog } from "./edit-saved-item-dialog"

interface SavedItem {
  id: string
  user_id: string
  type: "article" | "video" | "product" | "recipe" | "other"
  title: string
  url: string | null
  description: string | null
  tags: string[] | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

interface SavedItemCardProps {
  item: SavedItem
  onDelete: (itemId: string) => void
  onUpdate: (item: SavedItem) => void
}

export function SavedItemCard({ item, onDelete, onUpdate }: SavedItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("saved_items").delete().eq("id", item.id)

    if (error) {
      console.error("[v0] Error deleting saved item:", error)
      alert("Failed to delete item")
    } else {
      onDelete(item.id)
    }
    setIsDeleting(false)
  }

  const handleToggleFavorite = async () => {
    setIsFavoriting(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("saved_items")
      .update({ is_favorite: !item.is_favorite })
      .eq("id", item.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error toggling favorite:", error)
      alert("Failed to update item")
    } else if (data) {
      onUpdate(data)
    }
    setIsFavoriting(false)
  }

  return (
    <>
      <Card className="group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{item.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 shrink-0 ${item.is_favorite ? "text-yellow-500" : "text-muted-foreground"}`}
              onClick={handleToggleFavorite}
              disabled={isFavoriting}
            >
              <Star className="h-4 w-4" fill={item.is_favorite ? "currentColor" : "none"} />
            </Button>
          </div>
          <Badge variant="secondary" className="w-fit capitalize">
            {item.type}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {item.description && <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>}

          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            {item.url && (
              <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Visit
                </a>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className={!item.url ? "flex-1 bg-transparent" : "bg-transparent"}
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-3 w-3" />
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

      <EditSavedItemDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
