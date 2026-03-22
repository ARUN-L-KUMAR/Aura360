"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid3X3, List, ShoppingCart, Sparkles, Calendar } from "lucide-react"
import { DragDropDashboard } from "./drag-drop-dashboard"
import { WardrobeView } from "./wardrobe-view"
import { WishlistView } from "./wishlist-view"
import { FashionSenseBoard } from "./fashion-sense-board"
import { SeasonalPlanner } from "./seasonal-planner"
import type { FashionItem } from "@/lib/types/fashion"
import { toast } from "sonner"

interface FashionClientManagerProps {
  initialItems: FashionItem[]
}

export function FashionClientManager({ initialItems = [] }: FashionClientManagerProps) {
  const [items, setItems] = useState<FashionItem[]>(initialItems)

  const wardrobeItems = items.filter(i => i.status === "wardrobe")
  const wishlistItems = items.filter(i => i.status === "wishlist")

  const handleUpdateStatus = async (itemId: string, newStatus: "wardrobe" | "wishlist") => {
    try {
      const response = await fetch(`/api/fashion?id=${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) throw new Error("Failed to update item")

      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ))
      
      toast.success(`Item moved to ${newStatus === "wardrobe" ? "wardrobe" : "wishlist"}`)
    } catch (error) {
      console.error("Error updating item status:", error)
      toast.error("Failed to move item")
    }
  }

  const handleDeleteItem = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const handleUpdateItem = (updatedItem: FashionItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
  }

  const handleReorder = async (reorderedWardrobeItems: FashionItem[]) => {
    // 1. Update local state immediately for snappy UI
    const otherItems = items.filter(i => i.status !== "wardrobe")
    const newItems = [...reorderedWardrobeItems.reverse(), ...otherItems] // reverse because priority is higher first, but storage might be different. Wait.
    // Actually, WardrobeView already handled the priorities.
    
    // Merge back into main items list
    setItems(prev => {
      const remaining = prev.filter(i => i.status !== "wardrobe")
      return [...reorderedWardrobeItems, ...remaining]
    })

    // 2. Persist changes (de-duped/optimized)
    // Only update items whose priority actually changed compared to current state
    for (const item of reorderedWardrobeItems) {
      const original = items.find(i => i.id === item.id)
      if (original && original.metadata?.priority !== item.metadata?.priority) {
        try {
          await fetch(`/api/fashion?id=${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metadata: item.metadata }),
          })
        } catch (error) {
          console.error(`Failed to persist priority for item ${item.id}:`, error)
        }
      }
    }
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto">
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 mb-4 md:mb-8 border-b md:border-none">
          <TabsList className="flex items-center justify-start gap-1 bg-secondary/50 rounded-lg p-1 border w-full md:w-fit overflow-x-auto no-scrollbar h-auto shadow-none">
            <TabsTrigger value="overview" className="shrink-0 gap-2 px-3 md:px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap">
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="wardrobe" className="shrink-0 gap-2 px-3 md:px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap">
              <List className="w-3.5 h-3.5" />
              <span>Wardrobe</span>
            </TabsTrigger>
            <TabsTrigger value="wishlist" className="shrink-0 gap-2 px-3 md:px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Wishlist</span>
            </TabsTrigger>
            <TabsTrigger value="designer" className="shrink-0 gap-2 px-3 md:px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Designer</span>
            </TabsTrigger>
            <TabsTrigger value="planner" className="shrink-0 gap-2 px-3 md:px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" />
              <span>Planner</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="px-1">
          <TabsContent value="overview" className="mt-0 outline-none focus-visible:ring-0">
            <DragDropDashboard 
              initialItems={items} 
              onDelete={handleDeleteItem} 
              onUpdate={handleUpdateItem} 
            />
          </TabsContent>

          <TabsContent value="wardrobe" className="mt-0 outline-none focus-visible:ring-0">
            <WardrobeView 
              items={wardrobeItems} 
              onDeleteItem={handleDeleteItem} 
              onUpdateItem={handleUpdateItem} 
              onReorder={handleReorder}
            />
          </TabsContent>

          <TabsContent value="wishlist" className="mt-0 outline-none focus-visible:ring-0">
            <WishlistView 
              items={wishlistItems} 
              onDeleteItem={handleDeleteItem} 
              onUpdateItem={handleUpdateItem} 
            />
          </TabsContent>

          <TabsContent value="designer" className="mt-0 outline-none focus-visible:ring-0">
            <FashionSenseBoard
              wardrobeItems={wardrobeItems}
              wishlistItems={wishlistItems}
              onItemMovedToWardrobe={(item) => handleUpdateStatus(item.id, "wardrobe")}
              onItemMovedToWishlist={(item) => handleUpdateStatus(item.id, "wishlist")}
            />
          </TabsContent>

          <TabsContent value="planner" className="mt-0 outline-none focus-visible:ring-0">
            <SeasonalPlanner
              items={wardrobeItems}
              onUpdateItem={handleUpdateItem}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
