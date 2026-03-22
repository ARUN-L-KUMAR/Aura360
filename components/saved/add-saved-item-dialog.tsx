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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AddSavedItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

import { List as ListIcon, ListTodo, CheckSquare, Plus, X, Link as LinkIcon, Globe, Tag } from "lucide-react"

export function AddSavedItemDialog({ open, onOpenChange }: AddSavedItemDialogProps) {
  const [type, setType] = useState<"article" | "video" | "product" | "recipe" | "other">("article")
  const [title, setTitle] = useState("")
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [tags, setTags] = useState("")
  const [isChecklist, setIsChecklist] = useState(false)
  const [checklist, setChecklist] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const addChecklistItem = () => {
    setChecklist([...checklist, { id: crypto.randomUUID(), text: "", completed: false, url: "" }])
  }

  const updateChecklistItem = (id: string, updates: Partial<{ text: string; url: string; hasUrl: boolean }>) => {
    setChecklist(checklist.map((item) => item.id === id ? { ...item, ...updates } : item))
  }

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id))
  }

  const toggleChecklistItem = (id: string) => {
    setChecklist(checklist.map((item) => item.id === id ? { ...item, completed: !item.completed } : item))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          url: url || undefined,
          description: isChecklist ? "" : description || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          metadata: {
            checklist: isChecklist ? checklist.filter(i => i.text.trim()) : undefined
          }
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save item")
      }

      toast.success("Item saved successfully")
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("Error creating saved item:", error)
      toast.error("Failed to save item")
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setType("article")
    setTitle("")
    setUrl("")
    setDescription("")
    setTags("")
    setIsChecklist(false)
    setChecklist([])
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl bg-background/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <div className="p-6 md:p-8 space-y-6 overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  Save Content
                </DialogTitle>
                <DialogDescription className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
                  Bookmark for your collection
                </DialogDescription>
              </div>
              <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border">
                <button
                  type="button"
                  onClick={() => setIsChecklist(false)}
                  className={`p-1.5 rounded-md transition-all ${!isChecklist ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Standard View"
                >
                  <ListIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChecklist(true)}
                  className={`p-1.5 rounded-md transition-all ${isChecklist ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  title="Checklist View"
                >
                  <ListTodo className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Title
                  </Label>
                  <Input
                    id="title"
                    placeholder="Enter item title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="h-12 text-lg font-bold bg-secondary/30 border-none focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    {isChecklist ? "Checklist Items" : "Description"}
                  </Label>
                  
                  {isChecklist ? (
                    <div className="space-y-3 bg-secondary/30 rounded-xl p-4 shadow-inner">
                      {checklist.map((item) => (
                        <div key={item.id} className="space-y-2 group bg-background/40 p-2 rounded-lg border border-transparent hover:border-border/50 transition-all">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleChecklistItem(item.id)}
                              className={`shrink-0 transition-colors ${item.completed ? 'text-primary' : 'text-muted-foreground/30 hover:text-muted-foreground'}`}
                            >
                              <CheckSquare className="w-4 h-4" />
                            </button>
                            <Input
                              placeholder="Product name..."
                              value={item.text}
                              onChange={(e) => updateChecklistItem(item.id, { text: e.target.value })}
                              className={`h-8 text-xs bg-transparent border-none focus-visible:ring-0 flex-1 ${item.completed ? 'line-through text-muted-foreground/50' : ''}`}
                            />
                            
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateChecklistItem(item.id, { hasUrl: !item.hasUrl })}
                                className={cn(
                                  "p-1 rounded hover:bg-secondary transition-colors",
                                  item.hasUrl ? "text-primary bg-primary/10" : "text-muted-foreground/30"
                                )}
                                title="Add URL"
                              >
                                <Globe className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeChecklistItem(item.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground/40 hover:text-destructive transition-all"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {item.hasUrl && (
                            <div className="flex items-center gap-2 pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="w-px h-4 bg-border/50 ml-1.5" />
                              <div className="relative flex-1">
                                <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/40" />
                                <Input
                                  placeholder="Paste product URL..."
                                  value={item.url || ""}
                                  onChange={(e) => updateChecklistItem(item.id, { url: e.target.value })}
                                  className="h-7 pl-7 text-[10px] bg-secondary/20 border-none focus-visible:ring-primary/10"
                                />
                              </div>
                            </div>
                          )}
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
                      id="description"
                      placeholder="Add details about this item..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[120px] text-sm leading-relaxed bg-secondary/30 border-none focus-visible:ring-primary/20 placeholder:text-muted-foreground/30 resize-none shadow-inner p-4"
                    />
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground/40">Item Properties</span>
                  <div className="h-px bg-border/40 flex-1" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      Type
                    </Label>
                    <Select
                      value={type}
                      onValueChange={(value: any) => setType(value)}
                    >
                      <SelectTrigger id="type" className="h-9 text-xs bg-background/50 border-border shadow-none focus:ring-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="recipe">Recipe</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="url" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                      URL
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                      <Input
                        id="url"
                        type="url"
                        placeholder="https://..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-9 pl-8 text-xs bg-background/50 border-border focus-visible:ring-primary/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Tags
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/40" />
                    <Input
                      id="tags"
                      placeholder="tag1, tag2..."
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="h-9 pl-8 text-xs bg-background/50 border-border focus-visible:ring-primary/20"
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
              Cancel
            </button>
            <Button 
              type="submit" 
              disabled={isLoading} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-[10px] h-10 px-8 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isLoading ? "Saving..." : "Save Item"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
