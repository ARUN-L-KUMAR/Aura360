"use client"

import { useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import {
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Shirt, ExternalLink, ShoppingCart, Star, GripVertical } from "lucide-react"
import { toast } from "sonner"
import { EditFashionDialog } from "./edit-fashion-dialog"
import type { FashionItem } from "@/lib/types/fashion"

interface SortableFashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

function SortableFashionCard({ item, onDelete, onUpdate }: SortableFashionCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const buyingLink = item.metadata?.buyingLink
  const condition = item.metadata?.condition

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
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return

    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete item")
      }

      toast.success("Item deleted successfully")
      onDelete(item.id)
    } catch (error) {
      console.error("[v0] Error deleting fashion item:", error)
      toast.error("Failed to delete item")
    }
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={`group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all overflow-hidden cursor-grab active:cursor-grabbing ${isDragging ? 'shadow-2xl scale-105' : ''
          }`}
      >
        {/* Drag Handle */}
        <div
          className="absolute top-2 left-2 z-10 p-1 rounded bg-black/20 hover:bg-black/40 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-white" />
        </div>

        <CardContent className="p-4 space-y-3">
          <div className="aspect-square w-full overflow-hidden bg-muted relative rounded-lg">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                  target.className = "w-full h-full object-cover opacity-50";
                }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center border-b rounded-t-lg">
                <Shirt className="w-12 h-12 text-muted-foreground/40" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm line-clamp-1 tracking-tight">{item.name}</h3>
              {item.isFavorite && <Star className="w-3 h-3 text-foreground fill-current flex-shrink-0" />}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border">
                {item.category}
              </Badge>
              {item.color && (
                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5">
                  {item.color}
                </Badge>
              )}
            </div>
            {item.brand && <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">{item.brand}</p>}
            {item.price && <p className="text-sm font-bold text-foreground mt-1">₹{Number(item.price).toFixed(0)}</p>}
          </div>

          {buyingLink && (
            <Button asChild variant="outline" size="sm" className="h-7 w-full justify-center text-[10px] font-bold uppercase tracking-widest">
              <a href={buyingLink} target="_blank" rel="noreferrer" onPointerDown={(e) => e.stopPropagation()}>
                <ExternalLink className="h-3 w-3 mr-2" />
                Buy
              </a>
            </Button>
          )}

          <div className="flex items-center gap-1 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent text-[10px] font-bold uppercase tracking-widest h-7"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent text-[10px] h-7 px-2"
              onClick={handleDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditFashionDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}

interface DragDropWardrobeProps {
  items: FashionItem[]
  onItemsChange: (items: FashionItem[]) => void
}

export function DragDropWardrobe({ items, onItemsChange }: DragDropWardrobeProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id)
      const newIndex = items.findIndex((item) => item.id === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      onItemsChange(newItems)
    }
  }

  const handleItemDeleted = (itemId: string) => {
    const newItems = items.filter(item => item.id !== itemId)
    onItemsChange(newItems)
  }

  const handleItemUpdated = (updatedItem: FashionItem) => {
    const newItems = items.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    )
    onItemsChange(newItems)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Shirt className="w-4 h-4 text-primary" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            My Wardrobe
          </h2>
        </div>
        <span className="text-sm text-muted-foreground">
          {items.length} items • Drag to reorder
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Shirt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            No wardrobe items yet. Add your first piece!
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map(item => item.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <SortableFashionCard
                  key={item.id}
                  item={item}
                  onDelete={handleItemDeleted}
                  onUpdate={handleItemUpdated}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
