"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WardrobeView } from "./wardrobe-view"
import { WishlistView } from "./wishlist-view"
import { FashionSenseView } from "./fashion-sense-view"
import { SeasonalPlanner } from "./seasonal-planner"
import { Shirt, ShoppingCart, Sparkles, Calendar } from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"

interface FashionTabsProps {
  initialItems: FashionItem[]
}

export function FashionTabs({ initialItems }: FashionTabsProps) {
  const [activeTab, setActiveTab] = useState("wardrobe")
  const [items, setItems] = useState<FashionItem[]>(initialItems)

  const wardrobeItems = items.filter(item => item.status === "wardrobe")
  const wishlistItems = items.filter(item => item.status === "wishlist")

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleUpdateItem = (updatedItem: FashionItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
  }

  const handleReorder = (newItems: FashionItem[]) => {
    // Only update items in the current view (wardrobe)
    setItems(prev => {
      const otherItems = prev.filter(item => item.status !== "wardrobe")
      return [...newItems, ...otherItems]
    })
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="flex items-center justify-start gap-1 bg-secondary rounded-lg p-1 border w-fit mb-8 h-auto shadow-none">
        <TabsTrigger value="wardrobe" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
          <Shirt className="w-3.5 h-3.5" />
          My Wardrobe
        </TabsTrigger>
        <TabsTrigger value="wishlist" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
          <ShoppingCart className="w-3.5 h-3.5" />
          Need to Buy
        </TabsTrigger>
        <TabsTrigger value="fashion-sense" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5" />
          Fashion Sense
        </TabsTrigger>
        <TabsTrigger value="planner" className="gap-2 px-4 py-2 rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm font-bold uppercase tracking-widest text-[10px] text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          Planner
        </TabsTrigger>
      </TabsList>

      <TabsContent value="wardrobe" className="mt-6">
        <WardrobeView 
          items={wardrobeItems} 
          onDeleteItem={handleDeleteItem}
          onUpdateItem={handleUpdateItem}
          onReorder={handleReorder}
        />
      </TabsContent>

      <TabsContent value="wishlist" className="mt-6">
        <WishlistView 
          items={wishlistItems} 
          onDeleteItem={handleDeleteItem}
          onUpdateItem={handleUpdateItem}
        />
      </TabsContent>

      <TabsContent value="fashion-sense" className="mt-6">
        <FashionSenseView wardrobeItems={wardrobeItems} />
      </TabsContent>

      <TabsContent value="planner" className="mt-6">
        <SeasonalPlanner 
          items={wardrobeItems} 
          onUpdateItem={handleUpdateItem}
        />
      </TabsContent>
    </Tabs>
  )
}
