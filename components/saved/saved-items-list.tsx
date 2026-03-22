"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SavedItemCard } from "./saved-item-card"
import { Search, Grid, List as ListIcon } from "lucide-react"

interface SavedItem {
  id: string
  userId: string
  workspaceId: string
  type: "article" | "video" | "product" | "recipe" | "other"
  title: string
  url: string | null
  description: string | null
  imageUrl?: string | null
  tags: string[] | null
  isFavorite: boolean
  metadata?: any
  createdAt: string | Date
  updatedAt: string | Date
}

interface SavedItemsListProps {
  initialItems: SavedItem[]
}

export function SavedItemsList({ initialItems }: SavedItemsListProps) {
  const [items, setItems] = useState<SavedItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesType = filterType === "all" || item.type === filterType

    return matchesSearch && matchesType
  })

  const handleItemDeleted = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleItemUpdated = (updatedItem: SavedItem) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search saved items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-muted h-10 text-sm shadow-none focus-visible:ring-primary/20"
            />
          </div>
          
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-10 bg-background border-muted shadow-none focus:ring-primary/20">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="article">Articles</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="recipe">Recipes</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border h-10 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            title="List View"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground font-medium">
              {searchQuery || filterType !== "all"
                ? "No items found matching your filters."
                : "No saved items yet. Start bookmarking content!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === 'grid' 
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
          : "flex flex-col gap-2"
        }>
          {filteredItems.map((item) => (
            <SavedItemCard 
              key={item.id} 
              item={item} 
              viewMode={viewMode}
              onDelete={handleItemDeleted} 
              onUpdate={handleItemUpdated} 
            />
          ))}
        </div>
      )}
    </div>
  )
}
