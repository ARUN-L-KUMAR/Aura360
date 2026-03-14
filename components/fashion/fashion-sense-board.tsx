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
  DragOverEvent,
  DragStartEvent,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Shirt, Sparkles, Palette, Trash2, RotateCcw, Calendar, Grid3X3 } from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"

interface SortableBoardCardProps {
  item: FashionItem
  onRemove: (itemId: string) => void
}

function SortableBoardCard({ item, onRemove }: SortableBoardCardProps) {
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

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all overflow-hidden cursor-grab active:cursor-grabbing ${
        isDragging ? 'shadow-2xl scale-105 rotate-3' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-3">
        <div className="aspect-square w-full overflow-hidden bg-muted relative rounded">
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
            <div className="w-full h-full bg-secondary flex items-center justify-center border-b rounded">
              <Shirt className="w-8 h-8 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="mt-2">
          <h4 className="font-bold text-xs line-clamp-1 tracking-tight">{item.name}</h4>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-widest px-1 py-0 border">
              {item.category}
            </Badge>
          </div>
        </div>

        <Button
          variant="destructive"
          size="sm"
          className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(item.id)
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </CardContent>
    </Card>
  )
}

interface FashionSenseBoardProps {
  wardrobeItems: FashionItem[]
  wishlistItems: FashionItem[]
  onItemMovedToWardrobe: (item: FashionItem) => void
  onItemMovedToWishlist: (item: FashionItem) => void
}

export function FashionSenseBoard({
  wardrobeItems,
  wishlistItems,
  onItemMovedToWardrobe,
  onItemMovedToWishlist
}: FashionSenseBoardProps) {
  const [boardItems, setBoardItems] = useState<FashionItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

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

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Find which container the items are in
    const isActiveInWardrobe = wardrobeItems.some(item => item.id === activeId)
    const isActiveInWishlist = wishlistItems.some(item => item.id === activeId)
    const isActiveInBoard = boardItems.some(item => item.id === activeId)

    const isOverInBoard = boardItems.some(item => item.id === overId) || overId === 'board-drop-zone'

    // If dragging from wardrobe/wishlist to board
    if ((isActiveInWardrobe || isActiveInWishlist) && isOverInBoard) {
      if (!boardItems.some(item => item.id === activeId)) {
        const item = isActiveInWardrobe
          ? wardrobeItems.find(item => item.id === activeId)
          : wishlistItems.find(item => item.id === activeId)

        if (item) {
          setBoardItems(prev => [...prev, item])
        }
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle reordering within board
    if (boardItems.some(item => item.id === activeId) && boardItems.some(item => item.id === overId)) {
      const oldIndex = boardItems.findIndex((item) => item.id === activeId)
      const newIndex = boardItems.findIndex((item) => item.id === overId)

      setBoardItems(arrayMove(boardItems, oldIndex, newIndex))
    }

    // Handle dropping on board drop zone
    if (overId === 'board-drop-zone' && !boardItems.some(item => item.id === activeId)) {
      const item = wardrobeItems.find(item => item.id === activeId) ||
                   wishlistItems.find(item => item.id === activeId)

      if (item) {
        setBoardItems(prev => [...prev, item])
      }
    }
  }

  const removeFromBoard = (itemId: string) => {
    setBoardItems(prev => prev.filter(item => item.id !== itemId))
  }

  const clearBoard = () => {
    setBoardItems([])
  }

  const generateOutfitSuggestion = () => {
    // TODO: Implement AI outfit suggestion
    console.log('Generating outfit suggestion for:', boardItems)
  }

  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryTab, setInventoryTab] = useState<"wardrobe" | "wishlist">("wardrobe")
  const [mobileView, setMobileView] = useState<"inventory" | "canvas">("inventory")

  const filteredInventory = (inventoryTab === "wardrobe" ? wardrobeItems : wishlistItems).filter(item => 
    item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
    item.category.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            Designer
          </h2>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 uppercase tracking-widest font-bold">
            Create your perfect look
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearBoard}
            disabled={boardItems.length === 0}
            className="flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest bg-background h-9"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-2" />
            Reset
          </Button>
          <Button
            onClick={generateOutfitSuggestion}
            disabled={boardItems.length === 0}
            className="flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest h-9 px-4"
          >
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Refine
          </Button>
        </div>
      </div>

      {/* Mobile View Toggle */}
      <div className="lg:hidden flex bg-secondary/50 p-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest">
        <button 
          onClick={() => setMobileView("inventory")}
          className={`flex-1 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 ${mobileView === "inventory" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          Inventory
        </button>
        <button 
          onClick={() => setMobileView("canvas")}
          className={`flex-1 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 ${mobileView === "canvas" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Palette className="w-3.5 h-3.5" />
          Canvas ({boardItems.length})
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Inventory Panel */}
        <div className={`lg:col-span-4 flex-col border rounded-xl bg-card overflow-hidden shadow-sm h-[500px] lg:h-[700px] transition-all duration-300 ${mobileView === "inventory" ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-3 border-b bg-muted/20 space-y-3">
            <div className="flex bg-background p-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider">
              <button 
                onClick={() => setInventoryTab("wardrobe")}
                className={`flex-1 py-1.5 rounded-md transition-all ${inventoryTab === "wardrobe" ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Wardrobe
              </button>
              <button 
                onClick={() => setInventoryTab("wishlist")}
                className={`flex-1 py-1.5 rounded-md transition-all ${inventoryTab === "wishlist" ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Wishlist
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder="Search items..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full bg-background border rounded-lg pl-8 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/20 h-9"
              />
              <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
            <div className="grid grid-cols-2 gap-2">
              {filteredInventory.map((item) => (
                <Card 
                  key={item.id} 
                  className="cursor-pointer active:scale-95 hover:border-primary/50 transition-all group border-muted shadow-none bg-background overflow-hidden"
                  onClick={() => {
                   if (!boardItems.some(bi => bi.id === item.id)) {
                     setBoardItems(prev => [...prev, item])
                     if (window.innerWidth < 1024) {
                       // Optional: Switch to canvas view on select? Maybe not, could be annoying
                     }
                   }
                  }}
                >
                  <CardContent className="p-1.5">
                    <div className="aspect-square w-full overflow-hidden bg-muted rounded-md relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Shirt className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      )}
                      {boardItems.some(bi => bi.id === item.id) && (
                        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                          <div className="bg-background/90 p-1 rounded-full shadow-sm">
                            <Sparkles className="w-3 h-3 text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] font-bold uppercase tracking-tight mt-1.5 truncate text-muted-foreground px-0.5">{item.name}</p>
                  </CardContent>
                </Card>
              ))}
              {filteredInventory.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground text-[10px] uppercase font-bold tracking-widest opacity-50">
                  No matches
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Design Board */}
        <div className={`lg:col-span-8 flex-col h-[500px] lg:h-[700px] gap-4 transition-all duration-300 ${mobileView === "canvas" ? 'flex' : 'hidden lg:flex'}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              id="board-drop-zone"
              className={`flex-1 border-2 border-dashed rounded-xl p-4 md:p-8 transition-all flex flex-col relative overflow-hidden ${
                boardItems.length === 0
                  ? 'border-muted-foreground/10 bg-muted/10 items-center justify-center'
                  : 'border-primary/20 bg-background/50 items-start'
              }`}
            >
              <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Digital Canvas</span>
              </div>

              {boardItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center max-w-[200px] md:max-w-xs space-y-3">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted flex items-center justify-center border border-muted-foreground/5">
                    <Palette className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground/30" />
                  </div>
                  <div>
                    <p className="text-sm md:text-lg font-bold tracking-tight">Canvas Empty</p>
                    <p className="text-[10px] md:text-sm text-muted-foreground mt-1 leading-relaxed">
                      Select items from your inventory to start designing.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-y-auto custom-scrollbar pt-4">
                   <SortableContext items={boardItems.map(item => item.id)} strategy={rectSortingStrategy}>
                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                      {boardItems.map((item) => (
                        <SortableBoardCard
                          key={item.id}
                          item={item}
                          onRemove={removeFromBoard}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              )}
            </div>
          </DndContext>

          {/* Color Analysis */}
          {boardItems.length > 0 && (
            <Card className="bg-card/30 border-muted/50 backdrop-blur-sm shadow-none">
              <CardContent className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Layout</span>
                    <span className="text-xs font-bold">{boardItems.length} Items</span>
                  </div>
                  <Separator orientation="vertical" className="h-7 bg-border/50" />
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Palette</span>
                    <div className="flex gap-1 mt-0.5">
                      {Array.from(new Set(boardItems.map(item => item.color).filter(Boolean))).slice(0, 5).map((color) => (
                        <div 
                          key={color as string} 
                          title={color as string}
                          className="w-3.5 h-3.5 rounded-full border border-border/50 shadow-sm"
                          style={{ backgroundColor: (color as string).toLowerCase() }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-[9px] font-bold uppercase tracking-widest h-8 px-2.5">
                  <Calendar className="w-3 h-3 mr-1.5" />
                  Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}