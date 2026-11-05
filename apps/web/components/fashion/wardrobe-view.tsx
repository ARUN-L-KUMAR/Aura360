"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { SortableFashionCard } from "./sortable-fashion-card"
import { AddFashionButton } from "./add-fashion-button"
import { Search, Info, CheckSquare, X, Shirt, WashingMachine, Sparkles, Tag, Trash2, Clock } from "lucide-react"
import { toast } from "sonner"
import { isNeglected, localDateString } from "@/lib/fashion/wear-stats"
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
  const [onlyNeglected, setOnlyNeglected] = useState(false)

  // Bulk selection
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isApplying, setIsApplying] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [tagOpen, setTagOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

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

  const isFiltered = searchQuery !== "" || filterCategory !== "all" || filterColor !== "all" || filterStatus !== "all" || filterOccasion !== "all" || onlyNeglected

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

      const matchesNeglected = !onlyNeglected || isNeglected(item)

      return matchesSearch && matchesCategory && matchesColor && matchesStatus && matchesOccasion && matchesNeglected
    })
  }, [sortedItems, searchQuery, filterCategory, filterColor, filterStatus, filterOccasion, onlyNeglected])

  const neglectedCount = useMemo(() => items.filter((i) => isNeglected(i)).length, [items])

  // ─── Bulk actions ──────────────────────────────────────────────────────────
  const exitSelectMode = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected = filteredItems.length > 0 && filteredItems.every((i) => selectedIds.has(i.id))

  const toggleSelectAll = () => {
    setSelectedIds(allFilteredSelected ? new Set() : new Set(filteredItems.map((i) => i.id)))
  }

  const runBatch = async (payload: Record<string, unknown>, successMessage: string) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setIsApplying(true)
    try {
      const response = await fetch("/api/fashion/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ids }),
      })
      if (!response.ok) throw new Error("Batch action failed")
      const result = await response.json()

      if (payload.action === "delete") {
        for (const id of result.ids ?? ids) onDeleteItem(id)
      } else {
        for (const updated of result.items ?? []) {
          const current = items.find((i) => i.id === updated.id)
          if (current) onUpdateItem({ ...current, ...updated })
        }
      }
      toast.success(successMessage)
      exitSelectMode()
    } catch (error) {
      console.error("Bulk action failed:", error)
      toast.error("Bulk action failed. Please try again.")
    } finally {
      setIsApplying(false)
    }
  }

  const count = selectedIds.size
  const noun = `${count} item${count === 1 ? "" : "s"}`

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
          <AddFashionButton defaultType="buyed" className="h-10 md:h-9" />
          <Button
            variant={selectMode ? "secondary" : "outline"}
            size="sm"
            className="h-10 md:h-9 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
          >
            {selectMode ? <X className="w-3.5 h-3.5 mr-2" /> : <CheckSquare className="w-3.5 h-3.5 mr-2" />}
            {selectMode ? "Cancel" : "Select"}
          </Button>
          {!isFiltered && !selectMode && (
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

          <Button
            variant={onlyNeglected ? "secondary" : "outline"}
            size="sm"
            className="h-9 shrink-0 text-[10px] font-bold uppercase tracking-widest"
            onClick={() => setOnlyNeglected((v) => !v)}
            aria-pressed={onlyNeglected}
          >
            <Clock className="w-3.5 h-3.5 mr-2" />
            Neglected ({neglectedCount})
          </Button>
        </div>
      </div>

      {selectMode && (
        <div className="sticky top-16 z-30 flex flex-wrap items-center gap-2 rounded-lg border bg-card/95 backdrop-blur p-2 shadow-sm">
          <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest" onClick={toggleSelectAll}>
            {allFilteredSelected ? "Clear all" : `Select all (${filteredItems.length})`}
          </Button>
          <span className="text-xs text-muted-foreground mr-auto">{count} selected</span>

          <Button size="sm" variant="outline" disabled={count === 0 || isApplying} className="text-[10px] font-bold uppercase tracking-widest"
            onClick={() => runBatch({ action: "mark_worn", date: localDateString() }, `Logged ${noun} as worn today`)}>
            <Shirt className="w-3.5 h-3.5 mr-1.5" />Worn today
          </Button>
          <Button size="sm" variant="outline" disabled={count === 0 || isApplying} className="text-[10px] font-bold uppercase tracking-widest"
            onClick={() => runBatch({ action: "set_condition", condition: "needs_wash" }, `Marked ${noun} as needs wash`)}>
            <WashingMachine className="w-3.5 h-3.5 mr-1.5" />Needs wash
          </Button>
          <Button size="sm" variant="outline" disabled={count === 0 || isApplying} className="text-[10px] font-bold uppercase tracking-widest"
            onClick={() => runBatch({ action: "set_condition", condition: "good" }, `Marked ${noun} as clean`)}>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />Clean
          </Button>

          <Popover open={tagOpen} onOpenChange={setTagOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={count === 0 || isApplying} className="text-[10px] font-bold uppercase tracking-widest">
                <Tag className="w-3.5 h-3.5 mr-1.5" />Add tag
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-2" align="end">
              <Input
                autoFocus
                placeholder="Tag, e.g. work (comma-separated)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="h-9 text-xs"
              />
              <Button
                size="sm"
                className="w-full"
                disabled={!tagInput.trim() || isApplying}
                onClick={async () => {
                  const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean)
                  await runBatch({ action: "add_tags", tags }, `Tagged ${noun}`)
                  setTagInput("")
                  setTagOpen(false)
                }}
              >
                Apply to {noun}
              </Button>
            </PopoverContent>
          </Popover>

          <Button size="sm" variant="outline" disabled={count === 0 || isApplying}
            className="text-[10px] font-bold uppercase tracking-widest text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Delete
          </Button>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {noun}?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes them and their images. It can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplying}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isApplying}
              onClick={async (e) => {
                e.preventDefault()
                await runBatch({ action: "delete" }, `Deleted ${noun}`)
                setConfirmDelete(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            disabled={isFiltered || selectMode}
          >
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <SortableFashionCard 
                  key={item.id} 
                  item={item} 
                  onDelete={onDeleteItem} 
                  onUpdate={onUpdateItem}
                  selectMode={selectMode}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
