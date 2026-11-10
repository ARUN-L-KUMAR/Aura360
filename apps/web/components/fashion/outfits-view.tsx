"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Check, ChevronDown, ChevronUp, Pencil, Shirt, Trash2, Bookmark } from "lucide-react"
import { toast } from "sonner"
import type { FashionItem, FashionOutfit } from "@/lib/types/fashion"
import { localDateString } from "@/lib/fashion/wear-stats"

interface OutfitsViewProps {
  items: FashionItem[]
  onUpdateItem: (item: FashionItem) => void
}

export function OutfitsView({ items, onUpdateItem }: OutfitsViewProps) {
  const [outfits, setOutfits] = useState<FashionOutfit[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/fashion/outfits")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load outfits")
        return res.json()
      })
      .then((data: FashionOutfit[]) => !cancelled && setOutfits(data))
      .catch((error) => {
        console.error(error)
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const itemsById = new Map(items.map((i) => [i.id, i]))

  const logWorn = async (outfit: FashionOutfit) => {
    setBusyId(outfit.id)
    try {
      const res = await fetch(`/api/fashion/outfits?id=${outfit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log_worn", date: localDateString() }),
      })
      if (!res.ok) throw new Error("Failed to log outfit")
      const result = await res.json()

      if (result.alreadyLogged) {
        toast.info("Already logged for today")
        return
      }
      setOutfits((prev) => prev?.map((o) => (o.id === outfit.id ? result.outfit : o)) ?? prev)
      for (const updated of result.items ?? []) {
        const current = itemsById.get(updated.id)
        if (current) onUpdateItem({ ...current, ...updated })
      }
      toast.success(`Logged "${outfit.name}" as worn today`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to log outfit")
    } finally {
      setBusyId(null)
    }
  }

  const rename = async (outfit: FashionOutfit) => {
    const name = renameValue.trim()
    setRenamingId(null)
    if (!name || name === outfit.name) return
    try {
      const res = await fetch(`/api/fashion/outfits?id=${outfit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error("Failed to rename")
      const { outfit: updated } = await res.json()
      setOutfits((prev) => prev?.map((o) => (o.id === outfit.id ? updated : o)) ?? prev)
    } catch (error) {
      console.error(error)
      toast.error("Failed to rename outfit")
    }
  }

  const remove = async (outfit: FashionOutfit) => {
    setBusyId(outfit.id)
    try {
      const res = await fetch(`/api/fashion/outfits?id=${outfit.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setOutfits((prev) => prev?.filter((o) => o.id !== outfit.id) ?? prev)
      toast.success(`Deleted "${outfit.name}"`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete outfit")
    } finally {
      setBusyId(null)
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-secondary/10 py-20 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Couldn't load outfits</p>
      </div>
    )
  }

  if (outfits === null) {
    return <div className="py-20 text-center text-sm text-muted-foreground">Loading outfits...</div>
  }

  if (outfits.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-border bg-secondary/10 py-20 text-center">
        <Bookmark className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">No saved outfits yet</p>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-muted-foreground/60">
          Save looks from the Designer tab to build your outfit history.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {outfits.map((outfit) => {
        const pieces = outfit.itemIds.map((id) => itemsById.get(id)).filter(Boolean) as FashionItem[]
        const missing = outfit.itemIds.length - pieces.length
        const history = [...(outfit.wornDates ?? [])].reverse()
        const expanded = expandedId === outfit.id

        return (
          <Card key={outfit.id} className="overflow-hidden bg-card/80 backdrop-blur-sm">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {renamingId === outfit.id ? (
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => rename(outfit)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") rename(outfit)
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="h-8 text-sm"
                    />
                  ) : (
                    <h3 className="truncate text-lg font-bold tracking-tight">{outfit.name}</h3>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {outfit.occasion && (
                      <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">
                        {outfit.occasion}
                      </Badge>
                    )}
                    {outfit.vibe && (
                      <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider">
                        {outfit.vibe}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Rename outfit"
                    onClick={() => {
                      setRenamingId(outfit.id)
                      setRenameValue(outfit.name)
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    aria-label="Delete outfit"
                    disabled={busyId === outfit.id}
                    onClick={() => remove(outfit)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto">
                {pieces.map((item) => (
                  <div key={item.id} className="w-16 shrink-0" title={item.name}>
                    <div className="aspect-[3/4] overflow-hidden rounded-md bg-muted">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Shirt className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-muted-foreground">{item.name}</p>
                  </div>
                ))}
              </div>
              {missing > 0 && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">
                  {missing} piece{missing === 1 ? "" : "s"} no longer in your closet
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Worn {outfit.wearCount}×
                  {outfit.lastWornDate && ` · last ${new Date(`${outfit.lastWornDate}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
                {history.length > 0 && (
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium hover:text-foreground"
                    onClick={() => setExpandedId(expanded ? null : outfit.id)}
                  >
                    History
                    {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {expanded && (
                <ul className="max-h-32 space-y-1 overflow-y-auto rounded-md bg-secondary/30 p-2 text-xs">
                  {history.map((date) => (
                    <li key={date}>{new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</li>
                  ))}
                </ul>
              )}

              <Button
                size="sm"
                className="w-full text-[10px] font-bold uppercase tracking-wider"
                disabled={busyId === outfit.id}
                onClick={() => logWorn(outfit)}
              >
                <Check className="mr-1.5 h-3 w-3" />
                Wore it today
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
