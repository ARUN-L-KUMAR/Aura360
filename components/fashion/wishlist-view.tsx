"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FashionCard } from "./fashion-card"
import { Search, Plus, ShoppingCart } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { FashionItem } from "@/lib/types/fashion"

interface WishlistViewProps {
  items: FashionItem[]
  onDeleteItem: (itemId: string) => void
  onUpdateItem: (item: FashionItem) => void
}

export function WishlistView({ items, onDeleteItem, onUpdateItem }: WishlistViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const handleMarkAsBought = async (item: FashionItem) => {
    if (!confirm(`Mark "${item.name}" as bought and move to wardrobe?`)) return

    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "wardrobe",
          purchaseDate: new Date().toISOString().split('T')[0],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to mark as bought")
      }

      const updatedItem = { ...item, status: "wardrobe" as "wardrobe" }
      onUpdateItem(updatedItem)
      toast.success("Item marked as bought")
    } catch (error) {
      console.error("Error updating fashion item:", error)
      toast.error("Failed to mark as bought")
    }
  }

  const handleItemDeleted = (itemId: string) => {
    onDeleteItem(itemId)
  }

  const handleItemUpdated = (updatedItem: FashionItem) => {
    onUpdateItem(updatedItem)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card/80 backdrop-blur-sm h-10 md:h-9 text-xs"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border/50">
          <div className="space-y-4 max-w-xs mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {searchQuery ? "No matches found" : "Wishlist is empty"}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-2 uppercase tracking-widest leading-relaxed">
                Add items you're eyeing to track your future style additions.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative group">
              <FashionCard item={item} onDelete={handleItemDeleted} onUpdate={handleItemUpdated} />
              <div className="absolute top-2 right-2 flex flex-col gap-1">
                <Button
                  size="sm"
                  className="h-7 px-2 text-[9px] font-bold uppercase tracking-widest bg-green-600/90 hover:bg-green-600 text-white shadow-lg backdrop-blur-sm border-none"
                  onClick={() => handleMarkAsBought(item)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Bought
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}