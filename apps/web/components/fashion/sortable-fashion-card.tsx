"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { FashionCard } from "./fashion-card"
import type { FashionItem } from "@/lib/types/fashion"
import { GripVertical, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { daysSinceWorn, isNeglected } from "@/lib/fashion/wear-stats"

interface SortableFashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (itemId: string) => void
}

export function SortableFashionCard({
  item,
  onDelete,
  onUpdate,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: SortableFashionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: selectMode })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  }

  const neglected = isNeglected(item)
  const since = daysSinceWorn(item)

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {!selectMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-sm"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {neglected && !selectMode && (
        <span className="absolute top-2 right-2 z-10 rounded-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white shadow-sm">
          {since === null ? "Never worn" : `Unworn ${since}d`}
        </span>
      )}

      <div className={cn("rounded-xl transition-shadow", selected && "ring-2 ring-primary")}>
        <FashionCard item={item} onDelete={onDelete} onUpdate={onUpdate} />
      </div>

      {selectMode && (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={`${selected ? "Deselect" : "Select"} ${item.name}`}
          onClick={() => onToggleSelect?.(item.id)}
          className="absolute inset-0 z-20 rounded-xl cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span
            className={cn(
              "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md border-2 bg-background/90",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
            )}
          >
            {selected && <Check className="h-4 w-4" />}
          </span>
        </button>
      )}
    </div>
  )
}
