"use client"

import { useState } from "react"

import { AddFashionButton } from "./add-fashion-button"
import { FashionCard } from "./fashion-card"
import { Separator } from "@/components/ui/separator"
import type { FashionItem } from "@/lib/types/fashion"

interface DragDropDashboardProps {
  initialItems: FashionItem[]
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

export function DragDropDashboard({ initialItems, onDelete, onUpdate }: DragDropDashboardProps) {
  // Sort items by priority
  const sortedItems = [...initialItems].sort((a, b) => {
    const priorityA = a.metadata?.priority ?? 0
    const priorityB = b.metadata?.priority ?? 0
    return priorityB - priorityA
  })

  const wardrobeItems = sortedItems.filter(item => item.status === "wardrobe")
  const wishlistItems = sortedItems.filter(item => item.status === "wishlist")

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground line-clamp-1">
            Fashion Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm line-clamp-1">
            Summary of your style and collection activity
          </p>
        </div>
        <AddFashionButton />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="p-4 bg-card rounded-lg border border-border/50 shadow-sm">
          <div className="text-2xl font-bold text-foreground">{wardrobeItems.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Wardrobe</div>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50 shadow-sm">
          <div className="text-2xl font-bold text-foreground">{wishlistItems.length}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Wishlist</div>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50 shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {Array.from(new Set(wardrobeItems.map(item => item.category))).length}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Categories</div>
        </div>
        <div className="p-4 bg-card rounded-lg border border-border/50 shadow-sm">
          <div className="text-2xl font-bold text-foreground">
            {wardrobeItems.filter(item => item.isFavorite).length}
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Favorites</div>
        </div>
      </div>

      {/* Recent Wardrobe */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Additions</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Latest in Wardrobe</p>
        </div>
        {wardrobeItems.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed bg-secondary/20">
            <p className="text-muted-foreground text-sm font-medium">No wardrobe items yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {wardrobeItems.slice(0, 4).map((item) => (
              <FashionCard 
                key={item.id} 
                item={item} 
                onDelete={onDelete} 
                onUpdate={onUpdate} 
              />
            ))}
          </div>
        )}
      </div>

      <Separator className="bg-border/50" />

      {/* Recent Wishlist */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">On Your Radar</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Latest in Wishlist</p>
        </div>
        {wishlistItems.length === 0 ? (
          <div className="p-12 text-center rounded-lg border border-dashed bg-secondary/20">
            <p className="text-muted-foreground text-sm font-medium">Your wishlist is empty.</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {wishlistItems.slice(0, 4).map((item) => (
              <FashionCard 
                key={item.id} 
                item={item} 
                onDelete={onDelete} 
                onUpdate={onUpdate} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}