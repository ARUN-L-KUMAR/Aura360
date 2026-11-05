"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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

type Destination = "fashion" | "notes" | "saved" | "food" | "fitness"

type IngestPreview = {
  id: string
  url: string
  title: string
  description: string | null
  image: string | null
  source: "instagram" | "youtube" | "ecommerce" | "generic"
  type: "video" | "product" | "article" | "other"
  suggestedModule: Destination
  confidence: number
  cached: boolean
  requestedDestination: "auto" | Destination
  resolvedDestination: Destination
  persistedTo: Destination | null
  persistedRecordId: string | null
}

interface AddFromLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFromLinkDialog({ open, onOpenChange }: AddFromLinkDialogProps) {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [destination, setDestination] = useState<"auto" | Destination>("auto")
  const [preview, setPreview] = useState<IngestPreview | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const resetForm = () => {
    setUrl("")
    setDestination("auto")
    setPreview(null)
    setIsPreviewLoading(false)
    setIsSaving(false)
  }

  const fetchPreview = async (event?: React.FormEvent) => {
    event?.preventDefault()

    if (!url.trim()) {
      toast.error("Please enter a URL")
      return
    }

    setIsPreviewLoading(true)

    try {
      const response = await fetch("/api/ingest-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          destination,
          autoSave: false,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to ingest URL")
      }

      setPreview(data as IngestPreview)
      if (destination === "auto") {
        setDestination(data.resolvedDestination)
      }
    } catch (error) {
      console.error("[Add From Link] Preview error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to fetch preview")
    } finally {
      setIsPreviewLoading(false)
    }
  }

  const saveFromPreview = async () => {
    if (!url.trim()) {
      toast.error("Please enter a URL")
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch("/api/ingest-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          destination,
          autoSave: true,
        }),
      })

      const data = (await response.json()) as IngestPreview
      if (!response.ok) {
        throw new Error((data as { error?: string }).error || "Failed to save link")
      }

      toast.success(
        data.persistedTo
          ? `Saved to ${data.persistedTo}`
          : "Link ingested successfully"
      )

      onOpenChange(false)
      resetForm()
      router.refresh()
    } catch (error) {
      console.error("[Add From Link] Save error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save link")
    } finally {
      setIsSaving(false)
    }
  }

  const suggested = preview?.suggestedModule
  const confidencePercent = preview ? Math.round(preview.confidence * 100) : null

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen: boolean) => {
        onOpenChange(nextOpen)
        if (!nextOpen) {
          resetForm()
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={fetchPreview} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add from Link</DialogTitle>
            <DialogDescription>
              Paste a URL and Aura360 will ingest metadata, suggest a module, and save it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="ingest-url">URL</Label>
            <Input
              id="ingest-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="destination">Destination</Label>
            <Select
              value={destination}
              onValueChange={(value: "auto" | Destination) => setDestination(value)}
            >
              <SelectTrigger id="destination">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (recommended)</SelectItem>
                <SelectItem value="fashion">Fashion</SelectItem>
                <SelectItem value="notes">Notes</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="fitness">Fitness</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {preview && (
            <div className="rounded-md border p-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {preview.source}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  {preview.type}
                </Badge>
                {suggested && (
                  <Badge variant="outline" className="capitalize">
                    Suggested: {suggested}
                    {confidencePercent !== null ? ` (${confidencePercent}%)` : ""}
                  </Badge>
                )}
                {preview.cached && (
                  <Badge variant="outline">Cached</Badge>
                )}
              </div>

              {preview.image && (
                <img
                  src={preview.image}
                  alt={preview.title}
                  className="h-36 w-full rounded-md object-cover"
                  loading="lazy"
                />
              )}

              <div className="space-y-1">
                <p className="font-semibold line-clamp-2">{preview.title}</p>
                {preview.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{preview.description}</p>
                )}
                <p className="text-xs text-muted-foreground break-all">{preview.url}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="outline" disabled={isPreviewLoading || isSaving}>
              {isPreviewLoading ? "Fetching..." : "Preview"}
            </Button>
            <Button type="button" onClick={saveFromPreview} disabled={!preview || isSaving || isPreviewLoading}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
