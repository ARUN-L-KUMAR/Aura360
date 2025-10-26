"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Shirt, ExternalLink, ShoppingCart, Star, Heart } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditFashionDialog } from "./edit-fashion-dialog"

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

interface FashionCardProps {
  item: FashionItem
  onDelete: (itemId: string) => void
  onUpdate: (item: FashionItem) => void
}

export function FashionCard({ item, onDelete, onUpdate }: FashionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this item?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("fashion").delete().eq("id", item.id)

    if (error) {
      console.error("[v0] Error deleting fashion item:", error)
      alert("Failed to delete item")
    } else {
      onDelete(item.id)
    }
    setIsDeleting(false)
  }

  return (
    <>
      <Card className="group relative backdrop-blur-sm bg-card/80 hover:shadow-lg transition-all overflow-hidden">
        <CardHeader className="p-0">
          {item.image_url ? (
            <div className="aspect-square w-full overflow-hidden bg-muted relative">
              <img
                src={item.image_url}
                alt={item.item_name}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                  target.className = "w-full h-full object-cover opacity-50";
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div className="aspect-square w-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <Shirt className="w-16 h-16 text-indigo-400 dark:text-indigo-600" />
            </div>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg line-clamp-1">{item.item_name}</h3>
              {item.is_favorite && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {item.category}
              </Badge>
              {item.color && (
                <Badge variant="outline" className="text-xs">
                  {item.color}
                </Badge>
              )}
              {item.status && (
                <Badge variant="outline" className="text-xs">
                  {item.status}
                </Badge>
              )}
            </div>
            {item.occasion && item.occasion.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.occasion.slice(0, 2).map((occ) => (
                  <Badge key={occ} variant="outline" className="text-xs capitalize">
                    {occ}
                  </Badge>
                ))}
                {item.occasion.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.occasion.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            {item.brand && <p>Brand: {item.brand}</p>}
            {item.size && <p>Size: {item.size}</p>}
            {item.type === "buyed" && item.price && <p className="font-medium text-foreground">₹{Number(item.price).toFixed(2)}</p>}
            {item.type === "need_to_buy" && item.expected_budget && <p className="font-medium text-foreground">Budget: ₹{Number(item.expected_budget).toFixed(2)}</p>}
            {item.buying_link && (
              <Button
                variant="default"
                size="sm"
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                onClick={() => window.open(item.buying_link!, '_blank', 'noopener,noreferrer')}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {item.type === "buyed" ? "Buy Again" : "Buy Now"}
                <ExternalLink className="h-3 w-3 ml-2" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-transparent"
              onClick={() => setShowEditDialog(true)}
            >
              <Edit className="h-3 w-3 mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <EditFashionDialog item={item} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
