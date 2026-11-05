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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Shirt, Sparkles, Palette, Trash2, RotateCcw, Calendar, Grid3X3, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
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
        <div className="aspect-[3/4] w-full overflow-hidden bg-muted relative rounded">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
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
  const [isRefining, setIsRefining] = useState(false)
  const [critiqueResult, setCritiqueResult] = useState<any | null>(null)
  const [isCritiqueOpen, setIsCritiqueOpen] = useState(false)

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

    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    // Handle reordering within board
    if (boardItems.some(item => item.id === activeId) && boardItems.some(item => item.id === overId)) {
      setBoardItems(items => {
        const oldIndex = items.findIndex(item => item.id === activeId)
        const newIndex = items.findIndex(item => item.id === overId)
        return arrayMove(items, oldIndex, newIndex)
      })
      return
    }

    // Handle dropping onto board
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

  const generateOutfitSuggestion = async () => {
    if (boardItems.length === 0) {
      toast.error("Place at least one item onto the canvas to evaluate.")
      return
    }

    setIsRefining(true)
    try {
      const res = await fetch("/api/fashion/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "critique_look",
          params: {
            itemIds: boardItems.map(i => i.id),
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to evaluate outfit combination")
      }

      setCritiqueResult(data.critique)
      setIsCritiqueOpen(true)
      toast.success("Look evaluated by AI Stylist!")
    } catch (err: any) {
      console.error("[FashionSenseBoard evaluate error]:", err)
      toast.error(err.message || "Failed to refine look")
    } finally {
      setIsRefining(false)
    }
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
            disabled={boardItems.length === 0 || isRefining}
            className="flex-1 md:flex-none text-[10px] font-bold uppercase tracking-widest h-9 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isRefining ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Refining...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-2" />
                Refine Look
              </>
            )}
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
          Inventory ({filteredInventory.length})
        </button>
        <button 
          onClick={() => setMobileView("canvas")}
          className={`flex-1 py-2.5 rounded-md transition-all flex items-center justify-center gap-2 ${mobileView === "canvas" ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
        >
          <Palette className="w-3.5 h-3.5" />
          Canvas ({boardItems.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inventory Column */}
        <div className={`lg:col-span-4 flex-col gap-4 ${mobileView === "inventory" ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl border space-y-4">
            <div className="flex bg-secondary p-1 rounded-lg">
              <button
                onClick={() => setInventoryTab("wardrobe")}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                  inventoryTab === "wardrobe" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Wardrobe ({wardrobeItems.length})
              </button>
              <button
                onClick={() => setInventoryTab("wishlist")}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all ${
                  inventoryTab === "wishlist" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Wishlist ({wishlistItems.length})
              </button>
            </div>

            <input
              type="text"
              placeholder="Search items..."
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              className="w-full bg-background border px-3 py-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="grid grid-cols-2 gap-2 max-h-[500px] lg:max-h-[600px] overflow-y-auto custom-scrollbar p-1">
              {filteredInventory.map((item) => (
                <Card 
                  key={item.id} 
                  onClick={() => {
                    if (!boardItems.some(b => b.id === item.id)) {
                      setBoardItems(prev => [...prev, item])
                      toast.success(`Added ${item.name} to canvas`)
                    }
                  }}
                  className="group relative cursor-pointer border hover:border-primary/50 transition-all bg-background/50 hover:bg-background overflow-hidden"
                >
                  <CardContent className="p-2">
                    <div className="aspect-[3/4] rounded bg-muted overflow-hidden relative mb-1.5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-secondary">
                          <Shirt className="w-5 h-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-semibold truncate text-muted-foreground px-0.5">{item.name}</p>
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
                          className="w-3.5 h-3.5 rounded-full border border-border shadow-sm"
                          style={{ backgroundColor: (color as string).toLowerCase() }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={generateOutfitSuggestion}
                  disabled={isRefining}
                  variant="ghost" 
                  size="sm" 
                  className="text-[9px] font-bold uppercase tracking-widest h-8 px-2.5 text-primary"
                >
                  <Sparkles className="w-3 h-3 mr-1.5" />
                  Evaluate Look
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* AI Style Critique & Refinement Modal */}
      <Dialog open={isCritiqueOpen} onOpenChange={setIsCritiqueOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="w-5 h-5" />
              <DialogTitle className="text-lg font-black uppercase tracking-wider">
                AI Look Evaluation
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {critiqueResult?.verdict || "Critique and styling suggestions for your canvas combination"}
            </DialogDescription>
          </DialogHeader>

          {critiqueResult && (
            <div className="space-y-4 pt-2">
              {/* Harmony Score */}
              <div className="p-4 rounded-xl bg-secondary/30 border space-y-2">
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                  <span>Style Harmony Score</span>
                  <span className="text-primary font-black text-sm">{critiqueResult.harmonyScore}/100</span>
                </div>
                <Progress value={critiqueResult.harmonyScore} className="h-2" />
              </div>

              {/* Summary */}
              {critiqueResult.summary && (
                <div className="text-xs leading-relaxed text-muted-foreground p-3 rounded-lg bg-background border">
                  {critiqueResult.summary}
                </div>
              )}

              {/* Color and Silhouette Analysis */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {critiqueResult.colorAnalysis && (
                  <div className="p-3 rounded-lg bg-secondary/20 border space-y-1">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Color Harmony
                    </span>
                    <p className="font-semibold text-foreground text-xs">{critiqueResult.colorAnalysis.paletteType}</p>
                    <p className="text-[11px] text-muted-foreground">{critiqueResult.colorAnalysis.observation}</p>
                  </div>
                )}

                {critiqueResult.silhouette && (
                  <div className="p-3 rounded-lg bg-secondary/20 border space-y-1">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground block">
                      Silhouette & Fit
                    </span>
                    <p className="font-semibold text-foreground text-xs">{critiqueResult.silhouette.balance}</p>
                    <p className="text-[11px] text-muted-foreground">{critiqueResult.silhouette.tip}</p>
                  </div>
                )}
              </div>

              {/* Elevate Recommendations */}
              {critiqueResult.elevateTips && critiqueResult.elevateTips.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Directives to Elevate this Look:
                  </span>
                  <ul className="space-y-1.5">
                    {critiqueResult.elevateTips.map((tip: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-2 bg-secondary/20 p-2.5 rounded-lg border">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
