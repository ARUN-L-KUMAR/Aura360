"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FashionCard } from "./fashion-card"
import { SortableFashionCard } from "./sortable-fashion-card"
import { Search, Filter, GripVertical, Info } from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"
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

interface WardrobeViewProps {
  items: FashionItem[]
  onDeleteItem: (itemId: string) => void
  onUpdateItem: (item: FashionItem) => void
  onReorder: (items: FashionItem[]) => void
}

export function WardrobeView({ items, onDeleteItem, onUpdateItem, onReorder }: WardrobeViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterColor, setFilterColor] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterOccasion, setFilterOccasion] = useState<string>("all")

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const categories = Array.from(new Set(items.map((item) => item.category)))
  const colors = Array.from(new Set(items.map((item) => item.color).filter(Boolean))) as string[]
  const tags = Array.from(new Set(items.flatMap((item) => item.tags || [])))
  const statuses = ["wardrobe", "wishlist", "sold", "donated"] as const
  const occasions = tags

  const isFiltered = searchQuery !== "" || filterCategory !== "all" || filterColor !== "all" || filterStatus !== "all" || filterOccasion !== "all"

  // Sort items by priority if available
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const priorityA = a.metadata?.priority ?? 0
      const priorityB = b.metadata?.priority ?? 0
      return priorityB - priorityA // Higher priority first
    })
  }, [items])

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory = filterCategory === "all" || item.category === filterCategory
      const matchesColor = filterColor === "all" || item.color === filterColor
      const matchesStatus = filterStatus === "all" || item.status === filterStatus
      const matchesOccasion = filterOccasion === "all" || (item.tags && item.tags.includes(filterOccasion))

      return matchesSearch && matchesCategory && matchesColor && matchesStatus && matchesOccasion
    })
  }, [sortedItems, searchQuery, filterCategory, filterColor, filterStatus, filterOccasion])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id)
      const newIndex = sortedItems.findIndex((item) => item.id === over.id)

      const newOrderedItems = arrayMove(sortedItems, oldIndex, newIndex)
      
      // Update priorities based on new order
      const updatedWithPriorities = newOrderedItems.map((item, index) => ({
        ...item,
        metadata: {
          ...item.metadata,
          priority: newOrderedItems.length - index,
        },
      }))

      onReorder(updatedWithPriorities)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Search & Instructions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search wardrobe..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/80 backdrop-blur-sm h-10 md:h-9 text-xs"
            />
          </div>
          {!isFiltered && (
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg border border-border">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>Drag to Reorder</span>
            </div>
          )}
        </div>

        {/* Filters - Scrollable on mobile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 flex-nowrap sm:flex-wrap">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[130px] shrink-0 bg-card/80 backdrop-blur-sm h-9 text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-[110px] shrink-0 bg-card/80 backdrop-blur-sm h-9 text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              {colors.map((color) => (
                <SelectItem key={color} value={color}>{color}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] shrink-0 bg-card/80 backdrop-blur-sm h-9 text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterOccasion} onValueChange={setFilterOccasion}>
            <SelectTrigger className="w-[120px] shrink-0 bg-card/80 backdrop-blur-sm h-9 text-[10px] font-bold uppercase tracking-widest">
              <SelectValue placeholder="Occasion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Occasions</SelectItem>
              {occasions.map((occasion) => (
                <SelectItem key={occasion} value={occasion}>{occasion}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.2em]">
            {isFiltered
              ? "No matches found"
              : "Your wardrobe is empty"}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredItems.map(i => i.id)}
            strategy={rectSortingStrategy}
            disabled={isFiltered}
          >
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <SortableFashionCard 
                  key={item.id} 
                  item={item} 
                  onDelete={onDeleteItem} 
                  onUpdate={onUpdateItem} 
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
