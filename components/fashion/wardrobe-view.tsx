"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FashionCard } from "./fashion-card"
import { Search, Filter } from "lucide-react"

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

interface WardrobeViewProps {
  items: FashionItem[]
}

export function WardrobeView({ items }: WardrobeViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterColor, setFilterColor] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterOccasion, setFilterOccasion] = useState<string>("all")

  const categories = Array.from(new Set(items.map((item) => item.category)))
  const colors = Array.from(new Set(items.map((item) => item.color).filter(Boolean))) as string[]
  const statuses = Array.from(new Set(items.map((item) => item.status).filter(Boolean))) as string[]
  const occasions = Array.from(new Set(items.flatMap((item) => item.occasion || [])))

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.color?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesCategory = filterCategory === "all" || item.category === filterCategory
    const matchesColor = filterColor === "all" || item.color === filterColor
    const matchesStatus = filterStatus === "all" || item.status === filterStatus
    const matchesOccasion = filterOccasion === "all" || (item.occasion && item.occasion.includes(filterOccasion))

    return matchesSearch && matchesCategory && matchesColor && matchesStatus && matchesOccasion
  })

  const handleItemDeleted = (itemId: string) => {
    // This will be handled by parent component refresh
    window.location.reload()
  }

  const handleItemUpdated = (updatedItem: FashionItem) => {
    // This will be handled by parent component refresh
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search wardrobe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[140px] bg-card/80 backdrop-blur-sm">
              <SelectValue placeholder="Category" />
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

          <Select value={filterColor} onValueChange={setFilterColor}>
            <SelectTrigger className="w-[120px] bg-card/80 backdrop-blur-sm">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Colors</SelectItem>
              {colors.map((color) => (
                <SelectItem key={color} value={color}>
                  {color}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] bg-card/80 backdrop-blur-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterOccasion} onValueChange={setFilterOccasion}>
            <SelectTrigger className="w-[130px] bg-card/80 backdrop-blur-sm">
              <SelectValue placeholder="Occasion" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Occasions</SelectItem>
              {occasions.map((occasion) => (
                <SelectItem key={occasion} value={occasion}>
                  {occasion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery || filterCategory !== "all" || filterColor !== "all" || filterStatus !== "all" || filterOccasion !== "all"
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