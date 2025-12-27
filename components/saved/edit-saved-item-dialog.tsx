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
import { useState, useEffect } from "react"
import { toast } from "sonner"

interface SavedItem {
  id: string
  userId: string
  type: "article" | "video" | "product" | "recipe" | "other"
  title: string
  url: string | null
  description: string | null
  tags: string[] | null
  isFavorite: boolean
  createdAt: string
  updatedAt: string
}

interface EditSavedItemDialogProps {
  item: SavedItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (item: SavedItem) => void
}

export function EditSavedItemDialog({ item, open, onOpenChange, onUpdate }: EditSavedItemDialogProps) {
  const [type, setType] = useState<"article" | "video" | "product" | "recipe" | "other">(item.type)
  const [title, setTitle] = useState(item.title)
  const [url, setUrl] = useState(item.url || "")
  const [description, setDescription] = useState(item.description || "")
  const [tags, setTags] = useState(item.tags?.join(", ") || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setType(item.type)
    setTitle(item.title)
    setUrl(item.url || "")
    setDescription(item.description || "")
    setTags(item.tags?.join(", ") || "")
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const tagsArray = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)

      const response = await fetch(`/api/saved?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          title,
          url: url || undefined,
          description: description || undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update item")
      }

      const data = await response.json()
      toast.success("Item updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating saved item:", error)
      toast.error("Failed to update item")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Saved Item</DialogTitle>
            <DialogDescription>Make changes to your saved item</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={type}
                onValueChange={(value: "article" | "video" | "product" | "recipe" | "other") => setType(value)}
              >
                <SelectTrigger id="edit-type">
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

            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter item title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL (Optional)</Label>
              <Input
                id="edit-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags (Optional)</Label>
              <Input
                id="edit-tags"
                placeholder="Separate tags with commas"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-pink-600 hover:bg-pink-700">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
