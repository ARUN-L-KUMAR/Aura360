"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, ExternalLink, Star, MoveHorizontal, CheckSquare, Globe } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditSavedItemDialog } from "./edit-saved-item-dialog"
import { MoveToDialog } from "@/components/ui/move-to-dialog"

interface SavedItem {
  id: string
  userId: string
  workspaceId: string
  type: "article" | "video" | "product" | "recipe" | "other"
  title: string
  url: string | null
  description: string | null
  imageUrl?: string | null
  tags: string[] | null
  isFavorite: boolean
  metadata?: any
  createdAt: string | Date
  updatedAt: string | Date
}

interface SavedItemCardProps {
  item: SavedItem
  onDelete: (itemId: string) => void
  onUpdate: (item: SavedItem) => void
  viewMode?: 'grid' | 'list'
}

export function SavedItemCard({ item, onDelete, onUpdate, viewMode = 'grid' }: SavedItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isFavoriting, setIsFavoriting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [isTogglingItem, setIsTogglingItem] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this item?")) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/saved?id=${item.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete item")
      toast.success("Item deleted successfully")
      onDelete(item.id)
    } catch (error) {
      toast.error("Failed to delete item")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsFavoriting(true)
    try {
      const response = await fetch(`/api/saved?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !item.isFavorite }),
      })
      if (!response.ok) throw new Error("Failed to update item")
      const data = await response.json()
      onUpdate(data)
    } catch (error) {
      toast.error("Failed to update item")
    } finally {
      setIsFavoriting(false)
    }
  }

  const handleToggleChecklistItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTogglingItem) return
    setIsTogglingItem(itemId)

    const updatedChecklist = (item.metadata?.checklist as any[] || []).map(i => 
      i.id === itemId ? { ...i, completed: !i.completed } : i
    )

    try {
      const response = await fetch(`/api/saved?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...item.metadata,
            checklist: updatedChecklist
          }
        }),
      })
      if (!response.ok) throw new Error("Failed to update checklist")
      const data = await response.json()
      onUpdate(data)
    } catch (error) {
      toast.error("Failed to update item")
    } finally {
      setIsTogglingItem(null)
    }
  }

  const isList = viewMode === 'list'
  const checklist = item.metadata?.checklist as any[] | undefined

  return (
    <>
      <Card 
        onClick={() => setShowEditDialog(true)}
        className={`group relative cursor-pointer hover:border-primary/50 overflow-hidden ${
          isList ? 'flex flex-row items-center p-3 gap-4' : 'flex flex-col'
        }`}
      >
        {/* Favorite Ribbon */}
        {item.isFavorite && !isList && (
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none z-10">
            <div className="absolute top-[2px] right-[-14px] bg-yellow-500 text-white text-[8px] font-bold uppercase tracking-tight py-1 px-4 rotate-45 shadow-sm">
              STAR
            </div>
          </div>
        )}

        <div className={`flex flex-col flex-1 ${isList ? 'gap-1' : 'p-4 space-y-3'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                {item.type && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {item.type}
                  </span>
                )}
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                {checklist && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {checklist.filter(i => i.completed).length}/{checklist.length} DONE
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-foreground leading-tight truncate ${isList ? 'text-sm' : 'text-base'}`}>
                {item.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full bg-background/50 hover:bg-background border shadow-sm ${item.isFavorite ? "text-yellow-500" : "text-muted-foreground"}`}
                onClick={handleToggleFavorite}
                disabled={isFavoriting}
              >
                <Star className={`h-3.5 w-3.5 ${item.isFavorite ? "fill-current" : ""}`} />
              </Button>
               <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/50 hover:bg-primary hover:text-primary-foreground border shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMoveDialog(true)
                }}
              >
                <MoveHorizontal className="h-3.5 w-3.5" />
              </Button>
               <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full bg-background/50 hover:bg-destructive hover:text-destructive-foreground border shadow-sm"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {!isList && (
            <div className="min-h-[60px]">
              {checklist ? (
                <div className="space-y-1.5 mt-2">
                  {checklist.slice(0, 4).map((i) => (
                    <div 
                      key={i.id} 
                      className="flex items-center justify-between gap-2 text-[11px] group/item"
                    >
                      <div 
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                        onClick={(e) => handleToggleChecklistItem(i.id, e)}
                      >
                        <div className={`shrink-0 w-3.5 h-3.5 border rounded flex items-center justify-center transition-all ${i.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                          {i.completed && <CheckSquare className="w-2.5 h-2.5" />}
                        </div>
                        <span className={`line-clamp-1 ${i.completed ? 'line-through text-muted-foreground/50' : 'text-muted-foreground'}`}>
                          {i.text}
                        </span>
                      </div>

                      {i.url && (
                        <a 
                          href={i.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-secondary text-primary transition-colors opacity-0 group-hover/item:opacity-100"
                        >
                          <Globe className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                  {checklist.length > 4 && (
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest pt-1">
                      + {checklist.length - 4} more items
                    </p>
                  )}
                </div>
              ) : item.description && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-auto">
            <div className="flex flex-wrap gap-1">
              {item.tags && item.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-medium text-muted-foreground border bg-muted/30 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
            {item.url && (
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:text-primary/80 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </Card>

      <EditSavedItemDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
      <MoveToDialog
        itemId={item.id}
        sourceModule="saved"
        open={showMoveDialog}
        onOpenChange={setShowMoveDialog}
        onSuccess={(newItem, action) => {
          if (action === "move") {
            onDelete(item.id)
          } else {
            // Optional: You could add a toast or refresh logic for copy here
            // But toast is already handled in the dialog
          }
        }}
      />
    </>
  )
}

