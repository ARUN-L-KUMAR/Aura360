"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SavedItemCard } from "./saved-item-card"
import { Search } from "lucide-react"

interface SavedItem {
  id: string
  user_id: string
  type: "article" | "video" | "product" | "recipe" | "other"
  title: string
  url: string | null
  description: string | null
  tags: string[] | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

interface SavedItemsListProps {
  initialItems: SavedItem[]
}

export function SavedItemsList({ initialItems }: SavedItemsListProps) {
  const [items, setItems] = useState<SavedItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("all")

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())

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
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/80 backdrop-blur-sm">
            <SelectValue placeholder="Filter by type" />
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

      {filteredItems.length === 0 ? (
        <Card className="backdrop-blur-sm bg-card/80">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery || filterType !== "all"
                ? "No items found matching your filters."
                : "No saved items yet. Start bookmarking content!"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <SavedItemCard key={item.id} item={item} onDelete={handleItemDeleted} onUpdate={handleItemUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}
