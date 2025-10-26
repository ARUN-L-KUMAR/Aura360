"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FashionCard } from "./fashion-card"
import { Search, Plus, ShoppingCart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

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

interface WishlistViewProps {
  items: FashionItem[]
}

export function WishlistView({ items }: WishlistViewProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const router = useRouter()

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesSearch
  })

  const handleMarkAsBought = async (item: FashionItem) => {
    if (!confirm(`Mark "${item.item_name}" as bought and move to wardrobe?`)) return

    const supabase = createClient()

    const { error } = await supabase
      .from("fashion")
      .update({
        type: "buyed",
        purchase_date: new Date().toISOString().split('T')[0], // Today's date
        status: "New"
      })
      .eq("id", item.id)

    if (error) {
      console.error("[v0] Error updating fashion item:", error)
      alert("Failed to mark as bought")
    } else {
      router.refresh()
    }
  }

  const handleItemDeleted = (itemId: string) => {
    window.location.reload()
  }

  const handleItemUpdated = (updatedItem: FashionItem) => {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search wishlist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card/80 backdrop-blur-sm"
          />
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="space-y-4">
            <ShoppingCart className="w-16 h-16 text-muted-foreground mx-auto" />
            <div>
              <p className="text-muted-foreground">
                {searchQuery ? "No items found matching your search." : "No wishlist items yet."}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Add items you want to buy by pasting product links or entering details manually.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative">
              <FashionCard item={item} onDelete={handleItemDeleted} onUpdate={handleItemUpdated} />
              <div className="absolute top-2 right-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white shadow-md"
                  onClick={() => handleMarkAsBought(item)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Bought
                </Button>
              </div>
              {item.expected_budget && (
                <Badge variant="secondary" className="absolute bottom-2 left-2">
                  Budget: ₹{item.expected_budget}
                </Badge>
              )}
              {item.buy_deadline && (
                <Badge variant="outline" className="absolute bottom-2 right-2">
                  Due: {new Date(item.buy_deadline).toLocaleDateString()}
                </Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}