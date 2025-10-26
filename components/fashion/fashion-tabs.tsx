"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WardrobeView } from "./wardrobe-view"
import { WishlistView } from "./wishlist-view"
import { FashionSenseView } from "./fashion-sense-view"
import { Shirt, ShoppingCart, Sparkles } from "lucide-react"

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

interface FashionTabsProps {
  initialItems: FashionItem[]
}

export function FashionTabs({ initialItems }: FashionTabsProps) {
  const [activeTab, setActiveTab] = useState("wardrobe")

  const wardrobeItems = initialItems.filter(item => item.type === "buyed")
  const wishlistItems = initialItems.filter(item => item.type === "need_to_buy")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-card/80 backdrop-blur-sm">
        <TabsTrigger value="wardrobe" className="flex items-center gap-2">
          <Shirt className="w-4 h-4" />
          My Wardrobe
        </TabsTrigger>
        <TabsTrigger value="wishlist" className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" />
          Need to Buy
        </TabsTrigger>
        <TabsTrigger value="fashion-sense" className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Fashion Sense
        </TabsTrigger>
      </TabsList>

      <TabsContent value="wardrobe" className="mt-6">
        <WardrobeView items={wardrobeItems} />
      </TabsContent>

      <TabsContent value="wishlist" className="mt-6">
        <WishlistView items={wishlistItems} />
      </TabsContent>

      <TabsContent value="fashion-sense" className="mt-6">
        <FashionSenseView wardrobeItems={wardrobeItems} />
      </TabsContent>
    </Tabs>
  )
}