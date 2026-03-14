"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { FashionCard } from "./fashion-card"
import type { FashionItem } from "@/lib/types/fashion"
import { GripVertical } from "lucide-react"

interface SortableFashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

export function SortableFashionCard({ item, onDelete, onUpdate }: SortableFashionCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  }

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-background/80 backdrop-blur-sm p-1 rounded-md border shadow-sm"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      <FashionCard item={item} onDelete={onDelete} onUpdate={onUpdate} />
    </div>
  )
}
