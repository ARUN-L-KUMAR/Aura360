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
import { Shirt, Sparkles, Palette, Trash2, RotateCcw } from "lucide-react"

interface FashionItem {
  id: string
  user_id: string
  item_name: string
  category: string
  brand: string | null
  color: string | null
  size: string | null
  purchase_date: string | null
  price: number | null
  image_url: string | null
  buying_link: string | null
  notes: string | null
  type: "buyed" | "need_to_buy"
  status: string | null
  occasion: string[] | null
  season: string[] | null
  expected_budget: number | null
  buy_deadline: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

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
          {item.image_url ? (
            <img
              src={item.image_url}
              alt={item.item_name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.jpg";
                target.className = "w-full h-full object-cover opacity-50";
              }}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 flex items-center justify-center">
              <Shirt className="w-8 h-8 text-purple-400 dark:text-purple-600" />
            </div>
          )}
        </div>

        <div className="mt-2">
          <h4 className="font-medium text-xs line-clamp-1">{item.item_name}</h4>
          <div className="flex items-center gap-1 mt-1">
            <Badge variant="secondary" className="text-xs px-1 py-0">
              {item.category}
            </Badge>
            {item.color && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                {item.color}
              </Badge>
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          🎨 Fashion Sense Board
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearBoard}
            disabled={boardItems.length === 0}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear Board
          </Button>
          <Button
            onClick={generateOutfitSuggestion}
            disabled={boardItems.length === 0}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get AI Suggestions
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wardrobe Items */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            🧥 From Wardrobe
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {wardrobeItems.slice(0, 6).map((item) => (
              <Card key={item.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="aspect-square w-full overflow-hidden bg-muted relative rounded">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.jpg";
                          target.className = "w-full h-full object-cover opacity-50";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <Shirt className="w-6 h-6 text-indigo-400 dark:text-indigo-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium mt-1 line-clamp-1">{item.item_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Wishlist Items */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            🛍️ From Wishlist
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {wishlistItems.slice(0, 6).map((item) => (
              <Card key={item.id} className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
                <CardContent className="p-2">
                  <div className="aspect-square w-full overflow-hidden bg-muted relative rounded">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.item_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.jpg";
                          target.className = "w-full h-full object-cover opacity-50";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-100 to-pink-100 dark:from-orange-900/30 dark:to-pink-900/30 flex items-center justify-center">
                        <Shirt className="w-6 h-6 text-orange-400 dark:text-orange-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium mt-1 line-clamp-1">{item.item_name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Fashion Board */}
        <div className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            🎨 Your Board ({boardItems.length})
          </h3>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div
              id="board-drop-zone"
              className={`min-h-[300px] border-2 border-dashed rounded-lg p-4 transition-colors ${
                boardItems.length === 0
                  ? 'border-gray-300 hover:border-purple-300 bg-gray-50/50 dark:bg-gray-900/50'
                  : 'border-purple-300 bg-purple-50/50 dark:bg-purple-900/10'
              }`}
            >
              {boardItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Palette className="w-12 h-12 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Drag items here to create outfit combinations
                  </p>
                </div>
              ) : (
                <SortableContext items={boardItems.map(item => item.id)} strategy={rectSortingStrategy}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {boardItems.map((item) => (
                      <SortableBoardCard
                        key={item.id}
                        item={item}
                        onRemove={removeFromBoard}
                      />
                    ))}
                  </div>
                </SortableContext>
              )}
            </div>
          </DndContext>
        </div>
      </div>

      {/* Color Analysis */}
      {boardItems.length > 0 && (
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(new Set(boardItems.map(item => item.color).filter(Boolean))).map((color) => (
                <Badge key={color} variant="outline" className="capitalize">
                  {color}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {boardItems.length} items • Mix of {Array.from(new Set(boardItems.map(item => item.category))).length} categories
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}