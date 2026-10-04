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
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Shirt,
  Sparkles,
  Palette,
  Trash2,
  RotateCcw,
  Calendar,
  Grid3X3,
  Layers,
  ShoppingBag,
  Plus,
  Check,
  ChevronRight,
  RefreshCw,
  Sun,
  Flame,
  ThumbsUp,
  Tag,
  ArrowUpRight,
  TrendingUp,
  Bookmark,
} from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { localDateString } from "@/lib/fashion/wear-stats"

// ─── Sub-Card for Draggable Items on the Canvas ──────────────────────────────
interface SortableBoardCardProps {
  item: FashionItem
  onRemove: (itemId: string) => void
}

function SortableBoardCard({ item, onRemove }: SortableBoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group relative backdrop-blur-md bg-card/90 border-border hover:border-primary/40 hover:shadow-md transition-all overflow-hidden cursor-grab active:cursor-grabbing ${
        isDragging ? "shadow-2xl scale-105 rotate-2" : ""
      }`}
      {...attributes}
      {...listeners}
    >
      <CardContent className="p-2.5">
        <div className="aspect-square w-full overflow-hidden bg-muted relative rounded-md">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = "/placeholder.jpg"
                target.className = "w-full h-full object-cover opacity-50"
              }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center rounded">
              <Shirt className="w-7 h-7 text-muted-foreground/40" />
            </div>
          )}
        </div>

        <div className="mt-2 space-y-1">
          <h4 className="font-bold text-xs line-clamp-1 tracking-tight">{item.name}</h4>
          <div className="flex items-center justify-between gap-1">
            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider px-1 py-0">
              {item.category}
            </Badge>
            {item.color && (
              <span className="text-[9px] text-muted-foreground capitalize font-medium truncate max-w-[60px]">
                {item.color}
              </span>
            )}
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

// ─── Main Component Props ───────────────────────────────────────────────────
interface FashionAiDesignerStudioProps {
  wardrobeItems: FashionItem[]
  wishlistItems: FashionItem[]
  onItemMovedToWardrobe: (item: FashionItem) => void
  onItemMovedToWishlist: (item: FashionItem) => void
  onItemAdded?: (newItem: FashionItem) => void
  onUpdateItem?: (updatedItem: FashionItem) => void
}

export function FashionAiDesignerStudio({
  wardrobeItems,
  wishlistItems,
  onItemMovedToWardrobe,
  onItemMovedToWishlist,
  onItemAdded,
  onUpdateItem,
}: FashionAiDesignerStudioProps) {
  // Modes: "lookbook" | "canvas" | "gaps"
  const [activeStudioMode, setActiveStudioMode] = useState<"lookbook" | "canvas" | "gaps">("lookbook")

  // Lookbook Generator State
  const [selectedOccasion, setSelectedOccasion] = useState("Casual Everyday")
  const [selectedSeason, setSelectedSeason] = useState("All Seasons")
  const [selectedVibe, setSelectedVibe] = useState("Minimalist Chic")
  const [isGeneratingOutfits, setIsGeneratingOutfits] = useState(false)
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([])

  // Canvas State
  const [boardItems, setBoardItems] = useState<FashionItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [inventorySearch, setInventorySearch] = useState("")
  const [inventoryTab, setInventoryTab] = useState<"wardrobe" | "wishlist">("wardrobe")
  const [mobileCanvasView, setMobileCanvasView] = useState<"inventory" | "canvas">("inventory")

  // Critique State
  const [isAnalyzingCritique, setIsAnalyzingCritique] = useState(false)
  const [critiqueData, setCritiqueData] = useState<any | null>(null)

  // Wardrobe Gaps State
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false)
  const [gapsData, setGapsData] = useState<any | null>(null)
  const [addedGapIndices, setAddedGapIndices] = useState<Record<number, boolean>>({})

  // Sensors for DnD
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ─── DnD Handlers ──────────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const isActiveInWardrobe = wardrobeItems.some((item) => item.id === activeId)
    const isActiveInWishlist = wishlistItems.some((item) => item.id === activeId)
    const isOverInBoard = boardItems.some((item) => item.id === overId) || overId === "board-drop-zone"

    if ((isActiveInWardrobe || isActiveInWishlist) && isOverInBoard) {
      if (!boardItems.some((item) => item.id === activeId)) {
        const item = isActiveInWardrobe
          ? wardrobeItems.find((item) => item.id === activeId)
          : wishlistItems.find((item) => item.id === activeId)
        if (item) {
          setBoardItems((prev) => [...prev, item])
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

    if (boardItems.some((item) => item.id === activeId) && boardItems.some((item) => item.id === overId)) {
      const oldIndex = boardItems.findIndex((item) => item.id === activeId)
      const newIndex = boardItems.findIndex((item) => item.id === overId)
      setBoardItems(arrayMove(boardItems, oldIndex, newIndex))
    }

    if (overId === "board-drop-zone" && !boardItems.some((item) => item.id === activeId)) {
      const item = wardrobeItems.find((i) => i.id === activeId) || wishlistItems.find((i) => i.id === activeId)
      if (item) setBoardItems((prev) => [...prev, item])
    }
  }

  const removeFromBoard = (itemId: string) => {
    setBoardItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const clearBoard = () => {
    setBoardItems([])
    setCritiqueData(null)
  }

  // ─── API Action 1: Generate AI Outfits ──────────────────────────────────────
  const handleGenerateOutfits = async () => {
    setIsGeneratingOutfits(true)
    try {
      const res = await fetch("/api/fashion/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_outfits",
          params: {
            occasion: selectedOccasion,
            season: selectedSeason,
            vibe: selectedVibe,
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to generate outfits")
      const result = await res.json()

      if (result.success && Array.isArray(result.outfits)) {
        setGeneratedOutfits(result.outfits)
        toast.success(`Generated ${result.outfits.length} curated looks for ${selectedOccasion}`)
      } else {
        toast.error(result.message || "Could not generate outfits")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate looks. Please try again.")
    } finally {
      setIsGeneratingOutfits(false)
    }
  }

  // Load Outfit on Canvas
  const handleLoadOnCanvas = (itemIds: string[]) => {
    const itemsToLoad = wardrobeItems.filter((item) => itemIds.includes(item.id))
    setBoardItems(itemsToLoad)
    setActiveStudioMode("canvas")
    setCritiqueData(null)
    toast.success("Loaded outfit onto styling canvas")
  }

  // Log Outfit as Worn (single batch request instead of one PATCH per item)
  const handleLogOutfitAsWorn = async (itemIds: string[], outfitName: string) => {
    try {
      const date = localDateString()
      const res = await fetch("/api/fashion/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_worn", ids: itemIds, date }),
      })
      if (!res.ok) throw new Error("Failed to log outfit wear")

      if (onUpdateItem) {
        for (const id of itemIds) {
          const item = wardrobeItems.find((i) => i.id === id)
          if (item) onUpdateItem({ ...item, wearCount: (item.wearCount || 0) + 1, lastWornDate: date })
        }
      }
      toast.success(`Logged "${outfitName}" as worn today! Wear counts updated.`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to log outfit wear")
    }
  }

  // Save an outfit to the Outfits tab
  const handleSaveOutfit = async (
    itemIds: string[],
    name: string,
    extra: { occasion?: string; vibe?: string } = {}
  ) => {
    if (itemIds.length === 0) {
      toast.error("Add at least one item before saving")
      return
    }
    try {
      const res = await fetch("/api/fashion/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, itemIds, ...extra }),
      })
      if (!res.ok) throw new Error("Failed to save outfit")
      toast.success(`Saved "${name}" to your Outfits`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to save outfit")
    }
  }

  // ─── API Action 2: Critique Look on Canvas ─────────────────────────────────
  const handleCritiqueLook = async () => {
    if (boardItems.length === 0) {
      toast.error("Add at least one item to the canvas to critique")
      return
    }

    setIsAnalyzingCritique(true)
    try {
      const res = await fetch("/api/fashion/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "critique_look",
          params: {
            itemIds: boardItems.map((i) => i.id),
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to analyze outfit")
      const result = await res.json()

      if (result.success && result.critique) {
        setCritiqueData(result.critique)
        toast.success("AI Style Critique generated!")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to critique look")
    } finally {
      setIsAnalyzingCritique(false)
    }
  }

  // ─── API Action 3: Scan Wardrobe Gaps ───────────────────────────────────────
  const handleAnalyzeGaps = async () => {
    setIsAnalyzingGaps(true)
    try {
      const res = await fetch("/api/fashion/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "analyze_gaps",
        }),
      })

      if (!res.ok) throw new Error("Failed to scan wardrobe gaps")
      const result = await res.json()

      if (result.success && result.data) {
        setGapsData(result.data)
        toast.success("Closet versatility scan complete!")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to analyze wardrobe gaps")
    } finally {
      setIsAnalyzingGaps(false)
    }
  }

  // 1-Click Add Gap to Wishlist
  const handleAddGapToWishlist = async (gap: any, index: number) => {
    try {
      const res = await fetch("/api/fashion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: gap.name,
          category: gap.category || "other",
          color: gap.color || "neutral",
          price: gap.estimatedPrice || 100,
          status: "wishlist",
          tags: gap.styleTags || ["Capsule Essential"],
          notes: `AI Recommended Capsule Staple: ${gap.reasoning}. Projected to unlock ${gap.projectedOutfitsUnlocked} outfits.`,
        }),
      })

      if (!res.ok) throw new Error("Failed to save to wishlist")
      const createdItem = await res.json()

      setAddedGapIndices((prev) => ({ ...prev, [index]: true }))
      if (onItemAdded) {
        onItemAdded(createdItem)
      }
      toast.success(`"${gap.name}" added directly to your Wishlist!`)
    } catch (err) {
      console.error(err)
      toast.error("Failed to add item to wishlist")
    }
  }

  // Filtered inventory for the canvas panel
  const filteredInventory = (inventoryTab === "wardrobe" ? wardrobeItems : wishlistItems).filter(
    (item) =>
      item.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
      item.category.toLowerCase().includes(inventorySearch.toLowerCase())
  )

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Studio Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">AI Fashion Studio</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            Architect cohesive looks from your wardrobe, run AI style critiques, and detect wardrobe gaps.
          </p>
        </div>

        {/* 3 Core Modes */}
        <div className="flex bg-secondary/80 p-1 rounded-xl border shadow-sm w-full md:w-auto">
          <button
            onClick={() => setActiveStudioMode("lookbook")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              activeStudioMode === "lookbook"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Lookbook</span>
          </button>
          <button
            onClick={() => setActiveStudioMode("canvas")}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              activeStudioMode === "canvas"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Canvas & Critique</span>
          </button>
          <button
            onClick={() => {
              setActiveStudioMode("gaps")
              if (!gapsData && !isAnalyzingGaps) handleAnalyzeGaps()
            }}
            className={cn(
              "flex-1 md:flex-none flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
              activeStudioMode === "gaps"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Wardrobe Gaps</span>
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: AI OUTFIT ARCHITECT & LOOKBOOK                                */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeStudioMode === "lookbook" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <Card className="bg-card/70 border-border/80 shadow-sm backdrop-blur">
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Style Directives & Filters
              </CardTitle>
              <CardDescription className="text-xs">
                Select your target vibe, weather, and occasion to assemble matching outfits from your {wardrobeItems.length} wardrobe pieces.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Occasion */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Occasion
                  </label>
                  <select
                    value={selectedOccasion}
                    onChange={(e) => setSelectedOccasion(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "Casual Everyday",
                      "Work & Office",
                      "Date Night",
                      "Weekend Brunch",
                      "Semi-Formal / Dinner",
                      "Streetwear & Edgy",
                      "Travel & Airport",
                      "Gym & Activewear",
                    ].map((occ) => (
                      <option key={occ} value={occ}>
                        {occ}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Weather / Season */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Season & Climate
                  </label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "All Seasons",
                      "Spring (Mild & Breezy)",
                      "Summer (Hot & Light)",
                      "Autumn (Crisp & Layered)",
                      "Winter (Cold & Heavy Outerwear)",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Aesthetic Vibe */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Aesthetic Vibe
                  </label>
                  <select
                    value={selectedVibe}
                    onChange={(e) => setSelectedVibe(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "Minimalist Chic",
                      "Old Money / Clean Tailored",
                      "Bold & Modern Contemporary",
                      "Effortless Monochromatic",
                      "Relaxed Streetwear",
                      "Smart Casual Sophistication",
                    ].map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleGenerateOutfits}
                  disabled={isGeneratingOutfits || wardrobeItems.length === 0}
                  className="gap-2 text-xs font-bold uppercase tracking-wider px-5 h-9"
                >
                  <Sparkles className={cn("w-3.5 h-3.5", isGeneratingOutfits && "animate-spin")} />
                  {isGeneratingOutfits ? "Styling Looks..." : "Generate AI Outfits"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Outfits Showcase */}
          {generatedOutfits.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Curated Looks for {selectedOccasion}
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {generatedOutfits.length} Outfits Architected
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {generatedOutfits.map((outfit, index) => {
                  const itemsInOutfit = wardrobeItems.filter((i) => outfit.itemIds?.includes(i.id))

                  return (
                    <Card
                      key={outfit.id || index}
                      className="border-border hover:border-primary/50 transition-all flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md"
                    >
                      <CardHeader className="p-4 pb-2 border-b bg-muted/10">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="secondary" className="text-[9px] uppercase tracking-wider mb-1">
                              {outfit.vibe || selectedVibe}
                            </Badge>
                            <CardTitle className="text-base font-bold tracking-tight">
                              {outfit.name || `Ensemble ${index + 1}`}
                            </CardTitle>
                          </div>
                          {outfit.harmonyScore && (
                            <div className="text-right">
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                                {outfit.harmonyScore}% Harmony
                              </Badge>
                            </div>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4 flex-1">
                        {/* Items Thumbnail Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {itemsInOutfit.map((item) => (
                            <div key={item.id} className="group relative rounded-lg border bg-secondary/30 overflow-hidden">
                              <div className="aspect-square w-full">
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-muted">
                                    <Shirt className="w-5 h-5 text-muted-foreground/40" />
                                  </div>
                                )}
                              </div>
                              <p className="text-[9px] font-bold p-1 truncate text-center text-muted-foreground">
                                {item.name}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Layering & Styling Tips */}
                        <div className="space-y-2 pt-2 border-t text-xs">
                          {outfit.stylingTips && (
                            <div className="bg-secondary/40 p-2.5 rounded-lg border border-border/60">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-0.5">
                                Stylist's Tip
                              </span>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {outfit.stylingTips}
                              </p>
                            </div>
                          )}

                          {outfit.colorTheory && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
                              <Palette className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="text-[11px] leading-relaxed">{outfit.colorTheory}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>

                      <div className="p-3 border-t bg-muted/20 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadOnCanvas(outfit.itemIds)}
                          className="flex-1 text-[10px] font-bold uppercase tracking-wider h-8"
                        >
                          <Palette className="w-3 h-3 mr-1.5" />
                          Canvas
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleSaveOutfit(outfit.itemIds, outfit.name || `Ensemble ${index + 1}`, {
                              occasion: selectedOccasion,
                              vibe: outfit.vibe || selectedVibe,
                            })
                          }
                          className="flex-1 text-[10px] font-bold uppercase tracking-wider h-8"
                        >
                          <Bookmark className="w-3 h-3 mr-1.5" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleLogOutfitAsWorn(outfit.itemIds, outfit.name)}
                          className="flex-1 text-[10px] font-bold uppercase tracking-wider h-8"
                        >
                          <Check className="w-3 h-3 mr-1.5" />
                          Wear Today
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ) : (
            <Card className="border-dashed p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">No Looks Generated Yet</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Pick your occasion and vibe above, then click <strong>"Generate AI Outfits"</strong> to architect 3 tailor-made combinations from your actual wardrobe!
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: INTERACTIVE CANVAS & AI STYLE CRITIQUE                         */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeStudioMode === "canvas" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold tracking-tight">Interactive Styling Board</h3>
              <p className="text-xs text-muted-foreground">
                Drop items onto the digital canvas, rearrange freely, and run a live AI Style Critique.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={clearBoard}
                disabled={boardItems.length === 0}
                className="text-[10px] font-bold uppercase tracking-widest h-9"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Canvas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handleSaveOutfit(
                    boardItems.map((i) => i.id),
                    `Canvas look · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
                  )
                }
                disabled={boardItems.length === 0}
                className="text-[10px] font-bold uppercase tracking-widest h-9"
              >
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                Save Look
              </Button>
              <Button
                onClick={handleCritiqueLook}
                disabled={boardItems.length === 0 || isAnalyzingCritique}
                className="text-[10px] font-bold uppercase tracking-widest h-9 px-4 gap-2"
              >
                <Sparkles className={cn("w-3.5 h-3.5", isAnalyzingCritique && "animate-spin")} />
                {isAnalyzingCritique ? "Critiquing..." : "Analyze Look"}
              </Button>
            </div>
          </div>

          {/* Mobile View Toggle */}
          <div className="lg:hidden flex bg-secondary/50 p-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest">
            <button
              onClick={() => setMobileCanvasView("inventory")}
              className={cn(
                "flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2",
                mobileCanvasView === "inventory" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              Inventory
            </button>
            <button
              onClick={() => setMobileCanvasView("canvas")}
              className={cn(
                "flex-1 py-2 rounded-md transition-all flex items-center justify-center gap-2",
                mobileCanvasView === "canvas" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Palette className="w-3.5 h-3.5" />
              Canvas ({boardItems.length})
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Inventory Drawer */}
            <div
              className={cn(
                "lg:col-span-4 flex-col border rounded-xl bg-card overflow-hidden shadow-sm h-[520px] lg:h-[680px]",
                mobileCanvasView === "inventory" ? "flex" : "hidden lg:flex"
              )}
            >
              <div className="p-3 border-b bg-muted/20 space-y-3">
                <div className="flex bg-background p-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider">
                  <button
                    onClick={() => setInventoryTab("wardrobe")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md transition-all",
                      inventoryTab === "wardrobe"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Wardrobe ({wardrobeItems.length})
                  </button>
                  <button
                    onClick={() => setInventoryTab("wishlist")}
                    className={cn(
                      "flex-1 py-1.5 rounded-md transition-all",
                      inventoryTab === "wishlist"
                        ? "bg-secondary text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Wishlist ({wishlistItems.length})
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search closet..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full bg-background border rounded-lg pl-8 pr-4 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary h-8"
                  />
                  <Sparkles className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/60" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                <div className="grid grid-cols-2 gap-2">
                  {filteredInventory.map((item) => {
                    const isAdded = boardItems.some((bi) => bi.id === item.id)
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          "cursor-pointer active:scale-95 transition-all group border-muted shadow-none bg-background overflow-hidden",
                          isAdded && "ring-2 ring-primary/40"
                        )}
                        onClick={() => {
                          if (!isAdded) {
                            setBoardItems((prev) => [...prev, item])
                          } else {
                            removeFromBoard(item.id)
                          }
                        }}
                      >
                        <CardContent className="p-1.5">
                          <div className="aspect-square w-full overflow-hidden bg-muted rounded relative">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Shirt className="w-5 h-5 text-muted-foreground/30" />
                              </div>
                            )}
                            {isAdded && (
                              <div className="absolute inset-0 bg-primary/25 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="bg-background text-primary p-1 rounded-full shadow-sm">
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              </div>
                            )}
                          </div>
                          <p className="text-[9px] font-bold uppercase tracking-tight mt-1.5 truncate text-muted-foreground px-0.5">
                            {item.name}
                          </p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Design Board Drop Zone */}
            <div
              className={cn(
                "lg:col-span-8 flex-col h-[520px] lg:h-[680px] gap-4",
                mobileCanvasView === "canvas" ? "flex" : "hidden lg:flex"
              )}
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div
                  id="board-drop-zone"
                  className={cn(
                    "flex-1 border-2 border-dashed rounded-xl p-4 md:p-6 transition-all flex flex-col relative overflow-hidden",
                    boardItems.length === 0
                      ? "border-muted-foreground/20 bg-muted/10 items-center justify-center"
                      : "border-primary/30 bg-background/50 items-start"
                  )}
                >
                  <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none z-10">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Digital Canvas ({boardItems.length} Pieces)
                    </span>
                  </div>

                  {boardItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center max-w-xs space-y-3">
                      <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                        <Palette className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Canvas is Empty</p>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          Click any items on the left or load an AI Lookbook outfit to assemble your look here.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full overflow-y-auto pt-6">
                      <SortableContext items={boardItems.map((item) => item.id)} strategy={rectSortingStrategy}>
                        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                          {boardItems.map((item) => (
                            <SortableBoardCard key={item.id} item={item} onRemove={removeFromBoard} />
                          ))}
                        </div>
                      </SortableContext>
                    </div>
                  )}
                </div>
              </DndContext>

              {/* Palette Swatches Bar */}
              {boardItems.length > 0 && (
                <Card className="bg-card/40 border-border backdrop-blur-sm shadow-none">
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Palette
                        </span>
                        <div className="flex gap-1.5 mt-1">
                          {Array.from(new Set(boardItems.map((item) => item.color).filter(Boolean)))
                            .slice(0, 6)
                            .map((color) => (
                              <div
                                key={color as string}
                                title={color as string}
                                className="w-4 h-4 rounded-full border border-border shadow-xs"
                                style={{ backgroundColor: (color as string).toLowerCase() }}
                              />
                            ))}
                        </div>
                      </div>
                      <Separator orientation="vertical" className="h-6" />
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                          Pieces
                        </span>
                        <span className="text-xs font-bold">{boardItems.length} Items</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCritiqueLook}
                      disabled={isAnalyzingCritique}
                      className="text-[9px] font-bold uppercase tracking-wider h-8 gap-1.5"
                    >
                      <Sparkles className="w-3 h-3 text-primary" />
                      Style Analysis
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* AI Style Critique Card Section */}
          {critiqueData && (
            <Card className="border-primary/30 bg-card shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="p-5 pb-3 border-b bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest mb-1">
                      AI Style Critique
                    </Badge>
                    <CardTitle className="text-lg font-bold tracking-tight">
                      {critiqueData.verdict || "Ensemble Analysis"}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {critiqueData.summary}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3 bg-background p-2.5 rounded-xl border self-start sm:self-auto">
                    <div className="text-right">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground block">
                        Harmony Score
                      </span>
                      <span className="text-2xl font-black text-primary">
                        {critiqueData.harmonyScore}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Color Analysis */}
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-primary" />
                      Color Theory: {critiqueData.colorAnalysis?.paletteType || "Balanced"}
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {critiqueData.colorAnalysis?.observation}
                    </p>
                  </div>

                  {/* Silhouette Balance */}
                  <div className="p-3.5 rounded-xl bg-secondary/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      Silhouette & Proportions
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {critiqueData.silhouette?.balance || critiqueData.silhouette?.tip}
                    </p>
                  </div>
                </div>

                {/* Suitable Occasions */}
                {critiqueData.suitableOccasions && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Ideal Environments:
                    </span>
                    {critiqueData.suitableOccasions.map((occ: string) => (
                      <Badge key={occ} variant="secondary" className="text-[10px] font-semibold">
                        {occ}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Elevate Recommendations */}
                {critiqueData.elevateTips && (
                  <div className="border-t pt-3 space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-foreground">
                      <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                      How to Elevate This Look
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {critiqueData.elevateTips.map((tip: string, i: number) => (
                        <div key={i} className="p-2.5 rounded-lg bg-muted/40 border text-xs text-muted-foreground">
                          {tip}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* MODE 3: WARDROBE GAP RECOMMENDER & WISHLIST INTEGRATION               */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeStudioMode === "gaps" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold tracking-tight">Closet Versatility & Wardrobe Gaps</h3>
              <p className="text-xs text-muted-foreground">
                Identify essential foundational pieces missing from your wardrobe to unlock maximum outfit combinations.
              </p>
            </div>
            <Button
              onClick={handleAnalyzeGaps}
              disabled={isAnalyzingGaps}
              className="gap-2 text-xs font-bold uppercase tracking-wider h-9"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isAnalyzingGaps && "animate-spin")} />
              {isAnalyzingGaps ? "Scanning Closet..." : "Re-Scan Closet"}
            </Button>
          </div>

          {gapsData ? (
            <div className="space-y-6">
              {/* Health Score Summary Card */}
              <Card className="bg-gradient-to-r from-card via-card to-secondary/30 border-border shadow-sm">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                      Capsule Health Index
                    </span>
                    <h4 className="text-base font-bold tracking-tight">Wardrobe Distribution Analysis</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {gapsData.summary}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-background p-3 rounded-xl border shrink-0">
                    <TrendingUp className="w-6 h-6 text-primary" />
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Versatility Rating
                      </span>
                      <span className="text-2xl font-black text-foreground">
                        {gapsData.closetHealthScore || 80}/100
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Gaps List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  High-Impact Missing Pieces ({gapsData.gaps?.length || 0})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {gapsData.gaps?.map((gap: any, index: number) => {
                    const isAdded = addedGapIndices[index]

                    return (
                      <Card
                        key={gap.name || index}
                        className="border-border hover:border-primary/40 transition-all flex flex-col justify-between"
                      >
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider">
                              {gap.category}
                            </Badge>
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                              +{gap.projectedOutfitsUnlocked} Outfits
                            </Badge>
                          </div>
                          <CardTitle className="text-sm font-bold tracking-tight mt-2">
                            {gap.name}
                          </CardTitle>
                          <CardDescription className="text-xs line-clamp-3 mt-1 leading-relaxed">
                            {gap.reasoning}
                          </CardDescription>
                        </CardHeader>

                        <CardContent className="p-4 pt-2 space-y-3">
                          <div className="flex items-center justify-between text-xs pt-2 border-t">
                            <span className="text-muted-foreground font-medium">Estimated:</span>
                            <span className="font-bold text-foreground">
                              ${gap.estimatedPrice || 95}
                            </span>
                          </div>

                          <Button
                            onClick={() => handleAddGapToWishlist(gap, index)}
                            disabled={isAdded}
                            className={cn(
                              "w-full text-[10px] font-bold uppercase tracking-wider h-8 gap-1.5",
                              isAdded ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
                            )}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                Added to Wishlist
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                Add to Wishlist
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <Card className="border-dashed p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Scan Ready</h4>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Click <strong>"Re-Scan Closet"</strong> to let AI identify the missing pieces that will unlock the most outfits from your wardrobe!
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
