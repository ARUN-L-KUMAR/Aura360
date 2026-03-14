"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pin, Trash2, Edit, CheckSquare } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditNoteDialog } from "./edit-note-dialog"

import type { Note } from "@/lib/types/notes"

interface NoteCardProps {
  note: Note
  onDelete: (noteId: string) => void
  onUpdate: (note: Note) => void
  viewMode?: 'grid' | 'list'
}

export function NoteCard({ note, onDelete, onUpdate, viewMode = 'grid' }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isTogglingItem, setIsTogglingItem] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this note?")) return
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/notes?id=${note.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete note")
      toast.success("Note deleted successfully")
      onDelete(note.id)
    } catch (error) {
      toast.error("Failed to delete note")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleTogglePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPinning(true)
    try {
      const response = await fetch(`/api/notes?id=${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !note.isPinned }),
      })
      if (!response.ok) throw new Error("Failed to update note")
      const data = await response.json()
      onUpdate(data)
    } catch (error) {
      toast.error("Failed to update note")
    } finally {
      setIsPinning(false)
    }
  }

  const handleToggleItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (isTogglingItem) return
    setIsTogglingItem(itemId)

    const updatedChecklist = (note.metadata?.checklist as any[] || []).map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )

    try {
      const response = await fetch(`/api/notes?id=${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...note.metadata,
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
  const checklist = note.metadata?.checklist as any[] | undefined

  return (
    <>
      <Card 
        onClick={() => setShowEditDialog(true)}
        className={`group relative cursor-pointer hover:border-primary/50 overflow-hidden ${
          isList ? 'flex flex-row items-center p-3 gap-4' : 'flex flex-col'
        }`}
      >
        {/* Pinned Ribbon */}
        {note.isPinned && !isList && (
          <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none">
            <div className="absolute top-[2px] right-[-14px] bg-primary text-primary-foreground text-[8px] font-bold uppercase tracking-tight py-1 px-4 rotate-45 shadow-sm">
              PIN
            </div>
          </div>
        )}

        <div className={`flex flex-col flex-1 ${isList ? 'gap-1' : 'p-4 space-y-3'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
               <div className="flex items-center gap-2 mb-1">
                {note.category && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                    {note.category}
                  </span>
                )}
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  {new Date(note.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
                {checklist && (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {checklist.filter(i => i.completed).length}/{checklist.length} DONE
                  </span>
                )}
              </div>
              <h3 className={`font-bold text-foreground leading-tight truncate ${isList ? 'text-sm' : 'text-base'}`}>
                {note.title}
              </h3>
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 rounded-full bg-background/50 hover:bg-background border shadow-sm ${note.isPinned ? "text-primary" : "text-muted-foreground"}`}
                onClick={handleTogglePin}
                disabled={isPinning}
              >
                <Pin className={`h-3.5 w-3.5 ${note.isPinned ? "fill-current" : ""}`} />
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
                  {checklist.slice(0, 4).map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-2 text-[11px] group/item"
                      onClick={(e) => handleToggleItem(item.id, e)}
                    >
                      <div className={`shrink-0 w-3.5 h-3.5 border rounded flex items-center justify-center transition-all ${item.completed ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}`}>
                        {item.completed && <CheckSquare className="w-2.5 h-2.5" />}
                      </div>
                      <span className={`line-clamp-1 ${item.completed ? 'line-through text-muted-foreground/50' : 'text-muted-foreground'}`}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                  {checklist.length > 4 && (
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest pt-1">
                      + {checklist.length - 4} more items
                    </p>
                  )}
                </div>
              ) : note.content && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {note.content}
                </p>
              )}
            </div>
          )}

          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-auto">
              {note.tags.map((tag) => (
                <span key={tag} className="text-[9px] font-medium text-muted-foreground border bg-muted/30 px-1.5 py-0.5 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Card>

      <EditNoteDialog note={note} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
