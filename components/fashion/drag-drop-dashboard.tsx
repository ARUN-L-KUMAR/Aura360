"use client"

import { useState, useEffect, useRef } from "react"
import { DragDropWardrobe } from "./drag-drop-wardrobe"
import { DragDropWishlist } from "./drag-drop-wishlist"
import { FashionSenseBoard } from "./fashion-sense-board"
import { AddFashionButton } from "./add-fashion-button"
import { Separator } from "@/components/ui/separator"
import type { FashionItem } from "@/lib/types/fashion"

interface DragDropDashboardProps {
  initialItems: FashionItem[]
}

function applySavedOrder(items: FashionItem[], storageKey: string) {
  const savedOrder = localStorage.getItem(storageKey)

  if (!savedOrder) {
    return items
  }

  try {
    const order = JSON.parse(savedOrder) as string[]
    const orderedItems = order
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is FashionItem => Boolean(item))
    const remainingItems = items.filter((item) => !order.includes(item.id))

    return [...orderedItems, ...remainingItems]
  } catch (error) {
    console.error(`Error loading saved order for ${storageKey}:`, error)
    return items
  }
}

export function DragDropDashboard({ initialItems }: DragDropDashboardProps) {
  const [wardrobeItems, setWardrobeItems] = useState<FashionItem[]>(
    initialItems.filter(item => item.status === "wardrobe")
  )
  const [wishlistItems, setWishlistItems] = useState<FashionItem[]>(
    initialItems.filter(item => item.status === "wishlist")
  )
  const hasRestoredOrder = useRef(false)
  const skipNextWardrobePersist = useRef(false)
  const skipNextWishlistPersist = useRef(false)

  // Restore saved order whenever the source items change.
  useEffect(() => {
    const nextWardrobeItems = applySavedOrder(
      initialItems.filter((item) => item.status === "wardrobe"),
      "fashion-wardrobe-order"
    )
    const nextWishlistItems = applySavedOrder(
      initialItems.filter((item) => item.status === "wishlist"),
      "fashion-wishlist-order"
    )

    skipNextWardrobePersist.current = true
    skipNextWishlistPersist.current = true
    setWardrobeItems(nextWardrobeItems)
    setWishlistItems(nextWishlistItems)
    hasRestoredOrder.current = true
  }, [initialItems])

  // Save order only after the saved order has been restored.
  useEffect(() => {
    if (!hasRestoredOrder.current) {
      return
    }

    if (skipNextWardrobePersist.current) {
      skipNextWardrobePersist.current = false
      return
    }

    localStorage.setItem('fashion-wardrobe-order', JSON.stringify(wardrobeItems.map(item => item.id)))
  }, [wardrobeItems])

  useEffect(() => {
    if (!hasRestoredOrder.current) {
      return
    }

    if (skipNextWishlistPersist.current) {
      skipNextWishlistPersist.current = false
      return
    }

    localStorage.setItem('fashion-wishlist-order', JSON.stringify(wishlistItems.map(item => item.id)))
  }, [wishlistItems])

  const handleWardrobeItemsChange = (items: FashionItem[]) => {
    setWardrobeItems(items)
  }

  const handleWishlistItemsChange = (items: FashionItem[]) => {
    setWishlistItems(items)
  }

  const handleItemMovedToWardrobe = (item: FashionItem) => {
    // Update the item status and add to wardrobe
    const updatedItem = { ...item, status: "wardrobe" as const, purchaseDate: new Date().toISOString().split('T')[0] }
    setWardrobeItems(prev => [...prev, updatedItem])
    setWishlistItems(prev => prev.filter(i => i.id !== item.id))
  }

  const handleItemMovedToWishlist = (item: FashionItem) => {
    // Update the item status and add to wishlist
    const updatedItem = { ...item, status: "wishlist" as const }
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
              {wardrobeItems.filter(item => item.isFavorite).length}
            </div>
            <div className="text-sm text-muted-foreground">Favorites</div>
          </div>
        </div>
      </div>
    </div>
  )
}