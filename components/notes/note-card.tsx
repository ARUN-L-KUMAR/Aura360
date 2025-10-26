"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pin, Trash2, Edit } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditNoteDialog } from "./edit-note-dialog"

interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  category: string | null
  tags: string[] | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface NoteCardProps {
  note: Note
  onDelete: (noteId: string) => void
  onUpdate: (note: Note) => void
}

export function NoteCard({ note, onDelete, onUpdate }: NoteCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this note?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("notes").delete().eq("id", note.id)

    if (error) {
      console.error("[v0] Error deleting note:", error)
      alert("Failed to delete note")
    } else {
      onDelete(note.id)
    }
    setIsDeleting(false)
  }

  const handleTogglePin = async () => {
    setIsPinning(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("notes")
      .update({ is_pinned: !note.is_pinned })
      .eq("id", note.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error toggling pin:", error)
      alert("Failed to update note")
    } else if (data) {
      onUpdate(data)
    }
    setIsPinning(false)
  }

  return (
    <>
      <Card className="group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 shrink-0 ${note.is_pinned ? "text-teal-600" : "text-muted-foreground"}`}
              onClick={handleTogglePin}
              disabled={isPinning}
            >
              <Pin className="h-4 w-4" fill={note.is_pinned ? "currentColor" : "none"} />
            </Button>
          </div>
          {note.category && (
            <Badge variant="secondary" className="w-fit">
              {note.category}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {note.content && <p className="text-sm text-muted-foreground line-clamp-3">{note.content}</p>}
          {note.tags && note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {note.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
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

      <EditNoteDialog note={note} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
