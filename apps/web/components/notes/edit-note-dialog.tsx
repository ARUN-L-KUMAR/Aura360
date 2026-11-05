"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { List as ListIcon, ListTodo, CheckSquare, Plus, X } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import type { Note } from "@/lib/types/notes"

interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

interface EditNoteDialogProps {
  note: Note
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (note: Note) => void
}

export function EditNoteDialog({ note, open, onOpenChange, onUpdate }: EditNoteDialogProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content || "")
  const [category, setCategory] = useState(note.category || "")
  const [tags, setTags] = useState(note.tags?.join(", ") || "")
  const [isChecklist, setIsChecklist] = useState(!!note.metadata?.checklist)
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    (note.metadata?.checklist as ChecklistItem[]) || []
  )
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content || "")
    setCategory(note.category || "")
    setTags(note.tags?.join(", ") || "")
    setIsChecklist(!!note.metadata?.checklist)
    setChecklist((note.metadata?.checklist as ChecklistItem[]) || [])
  }, [note])

  const addChecklistItem = () => {
    setChecklist([...checklist, { id: crypto.randomUUID(), text: "", completed: false }])
  }

  const updateChecklistItem = (id: string, text: string) => {
    setChecklist(checklist.map((item: ChecklistItem) => item.id === id ? { ...item, text } : item))
  }

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item: ChecklistItem) => item.id !== id))
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map((item: ChecklistItem) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch(`/api/notes?id=${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: isChecklist ? "" : content || undefined,
          category: category || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          metadata: {
            ...note.metadata,
            checklist: isChecklist ? checklist.filter((i: ChecklistItem) => i.text.trim()) : undefined
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update note")
      }

      const data = await response.json()
      toast.success("Note updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating note:", error)
      toast.error("Failed to update note")
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Edit Thought
                </DialogTitle>
                <DialogDescription className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                  Refine and organize your ideas
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setIsChecklist(false)}
                  className={`p-1.5 rounded-md transition-all ${!isChecklist ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Standard Note"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChecklist(true)}
                  className={`p-1.5 rounded-md transition-all ${isChecklist ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Checklist Mode"
                >
                  <ListTodo className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              {/* Primary Content Section */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Title
                  </Label>
                  <Input
                    id="edit-title"
                    placeholder="Note title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-12 text-lg font-bold bg-secondary/30 border-none focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    {isChecklist ? "Checklist Items" : "Content"}
                  </Label>
                  
                  {isChecklist ? (
                    <div className="space-y-2 bg-secondary/30 rounded-xl p-4 shadow-inner">
                      {checklist.map((item: ChecklistItem) => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <button
                            type="button"
                            onClick={() => toggleChecklistItem(item.id)}
                            className={`shrink-0 transition-colors ${item.completed ? 'text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                          <Input
                            placeholder="Item description..."
                            value={item.text}
                            onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                            className={`h-8 text-xs bg-transparent border-none focus-visible:ring-0 ${item.completed ? 'line-through text-muted-foreground/50' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/40 hover:text-destructive transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="flex items-center gap-2 px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors mt-2"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Item
                      </button>
                    </div>
                  ) : (
                    <Textarea
                      id="edit-content"
                      placeholder="Write your note here..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[200px] text-sm leading-relaxed bg-secondary/30 border-none focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 resize-none shadow-inner p-4"
                    />
                  )}
                </div>
              </div>

              {/* Metadata Section - Grouped and Styled */}
              <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Context & Tags</span>
                  <div className="h-px bg-border/40 flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Category
                    </Label>
                    <Input
                      id="edit-category"
                      placeholder="e.g., Ideas, Work"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-9 text-xs bg-background/50 border-border focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-tags" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Tags
                    </Label>
                    <Input
                      id="edit-tags"
                      placeholder="tag1, tag2..."
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-9 text-xs bg-background/50 border-border focus-visible:ring-primary/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:px-8 py-4 bg-secondary/10 border-t flex items-center justify-between gap-4">
            <button 
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Discard Changes
            </button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-[10px] h-10 px-8 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
