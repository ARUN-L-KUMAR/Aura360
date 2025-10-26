"use client"

import { useState, useEffect } from "react"
import { DragDropWardrobe } from "./drag-drop-wardrobe"
import { DragDropWishlist } from "./drag-drop-wishlist"
import { FashionSenseBoard } from "./fashion-sense-board"
import { AddFashionButton } from "./add-fashion-button"
import { Separator } from "@/components/ui/separator"

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

interface DragDropDashboardProps {
  initialItems: FashionItem[]
}

export function DragDropDashboard({ initialItems }: DragDropDashboardProps) {
  const [wardrobeItems, setWardrobeItems] = useState<FashionItem[]>(
    initialItems.filter(item => item.type === "buyed")
  )
  const [wishlistItems, setWishlistItems] = useState<FashionItem[]>(
    initialItems.filter(item => item.type === "need_to_buy")
  )

  // Load saved order from localStorage on mount
  useEffect(() => {
    const savedWardrobeOrder = localStorage.getItem('fashion-wardrobe-order')
    const savedWishlistOrder = localStorage.getItem('fashion-wishlist-order')

    if (savedWardrobeOrder) {
      try {
        const order = JSON.parse(savedWardrobeOrder)
        const orderedItems = order
          .map((id: string) => wardrobeItems.find(item => item.id === id))
          .filter(Boolean)
        const remainingItems = wardrobeItems.filter(item => !order.includes(item.id))
        setWardrobeItems([...orderedItems, ...remainingItems])
      } catch (error) {
        console.error('Error loading wardrobe order:', error)
      }
    }

    if (savedWishlistOrder) {
      try {
        const order = JSON.parse(savedWishlistOrder)
        const orderedItems = order
          .map((id: string) => wishlistItems.find(item => item.id === id))
          .filter(Boolean)
        const remainingItems = wishlistItems.filter(item => !order.includes(item.id))
        setWishlistItems([...orderedItems, ...remainingItems])
      } catch (error) {
        console.error('Error loading wishlist order:', error)
      }
    }
  }, [])

  // Save order to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('fashion-wardrobe-order', JSON.stringify(wardrobeItems.map(item => item.id)))
  }, [wardrobeItems])

  useEffect(() => {
    localStorage.setItem('fashion-wishlist-order', JSON.stringify(wishlistItems.map(item => item.id)))
  }, [wishlistItems])

  const handleWardrobeItemsChange = (items: FashionItem[]) => {
    setWardrobeItems(items)
  }

  const handleWishlistItemsChange = (items: FashionItem[]) => {
    setWishlistItems(items)
  }

  const handleItemMovedToWardrobe = (item: FashionItem) => {
    // Update the item type and add to wardrobe
    const updatedItem = { ...item, type: "buyed" as const, purchase_date: new Date().toISOString().split('T')[0], status: "New" }
    setWardrobeItems(prev => [...prev, updatedItem])
    setWishlistItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleItemMovedToWishlist = (item: FashionItem) => {
    // Update the item type and add to wishlist
    const updatedItem = { ...item, type: "need_to_buy" as const }
    setWishlistItems(prev => [...prev, updatedItem])
    setWardrobeItems(prev => prev.filter(i => i.id !== item.id))
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Fashion Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your wardrobe, manage your wishlist, and experiment with outfits
          </p>
        </div>
        <AddFashionButton />
      </div>

      {/* Wardrobe Section */}
      <DragDropWardrobe
        items={wardrobeItems}
        onItemsChange={handleWardrobeItemsChange}
      />

      <Separator className="my-8" />

      {/* Wishlist Section */}
      <DragDropWishlist
        items={wishlistItems}
        onItemsChange={handleWishlistItemsChange}
        onItemMovedToWardrobe={handleItemMovedToWardrobe}
      />

      <Separator className="my-8" />

      {/* Fashion Sense Board */}
      <FashionSenseBoard
        wardrobeItems={wardrobeItems}
        wishlistItems={wishlistItems}
        onItemMovedToWardrobe={handleItemMovedToWardrobe}
        onItemMovedToWishlist={handleItemMovedToWishlist}
      />

      {/* Stats Footer */}
      <div className="mt-12 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg">
        <div className="grid gap-4 md:grid-cols-4 text-center">
          <div>
            <div className="text-2xl font-bold text-indigo-600">{wardrobeItems.length}</div>
            <div className="text-sm text-muted-foreground">Wardrobe Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">{wishlistItems.length}</div>
            <div className="text-sm text-muted-foreground">Wishlist Items</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">
              {Array.from(new Set(wardrobeItems.map(item => item.category))).length}
            </div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-pink-600">
              {wardrobeItems.filter(item => item.is_favorite).length}
            </div>
            <div className="text-sm text-muted-foreground">Favorites</div>
          </div>
        </div>
      </div>
    </div>
  )
}