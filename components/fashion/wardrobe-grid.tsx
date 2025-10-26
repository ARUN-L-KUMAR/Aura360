"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FashionCard } from "./fashion-card"
import { Search } from "lucide-react"

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
  notes: string | null
  created_at: string
  updated_at: string
}

interface WardrobeGridProps {
  initialItems: FashionItem[]
}

export function WardrobeGrid({ initialItems }: WardrobeGridProps) {
  const [items, setItems] = useState<FashionItem[]>(initialItems)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const categories = Array.from(new Set(items.map((item) => item.category)))

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === "all" || item.category === filterCategory

    return matchesSearch && matchesCategory
  })

  const handleItemDeleted = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const handleItemUpdated = (updatedItem: FashionItem) => {
    setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search wardrobe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card/80 backdrop-blur-sm">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || filterCategory !== "all"
              ? "No items found matching your filters."
              : "No wardrobe items yet. Add your first piece!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <FashionCard key={item.id} item={item} onDelete={handleItemDeleted} onUpdate={handleItemUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}
