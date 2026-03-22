"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Filter, Shirt, Sparkles, Wind, Sun, Cloud, Snowflake, CheckCircle2 } from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface SeasonalPlannerProps {
  items: FashionItem[]
  onUpdateItem: (item: FashionItem) => void
}

export function SeasonalPlanner({ items, onUpdateItem }: SeasonalPlannerProps) {
  const [activeSeason, setActiveSeason] = useState<string>("all")

  const seasons = [
    { id: "all", label: "All Year", icon: Sparkles, color: "text-slate-500" },
    { id: "spring", label: "Spring", icon: Cloud, color: "text-emerald-500" },
    { id: "summer", label: "Summer", icon: Sun, color: "text-amber-500" },
    { id: "fall", label: "Fall", icon: Wind, color: "text-orange-500" },
    { id: "winter", label: "Winter", icon: Snowflake, color: "text-blue-500" },
  ]

  const filteredItems = items.filter(item => {
    if (activeSeason === "all") return true
    return item.season?.includes(activeSeason)
  })

  const laundryNeeded = items.filter(item => item.condition === "needs_wash")

  const handleMarkClean = async (item: FashionItem) => {
    try {
      const response = await fetch(`/api/fashion?id=${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ condition: "good" }),
      })

      if (!response.ok) throw new Error("Failed to update item")
      
      onUpdateItem({ ...item, condition: "good" })
      toast.success(`${item.name} marked as clean`)
    } catch (error) {
      toast.error("Failed to update laundry status")
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Laundry Quick View */}
        <Card className="md:col-span-1 border-rose-100 dark:border-rose-900/20 bg-rose-50/30 dark:bg-rose-900/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-rose-600 flex items-center gap-2">
              <Wind className="w-4 h-4" />
              Laundry Room
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {laundryNeeded.length > 0 ? (
              <div className="space-y-3">
                {laundryNeeded.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-rose-100 dark:border-rose-900/20">
                    <span className="text-[10px] font-bold truncate max-w-[100px]">{item.name}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      onClick={() => handleMarkClean(item)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                {laundryNeeded.length > 3 && (
                  <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-tighter">
                    + {laundryNeeded.length - 3} more items
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">All Clean!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Season Statistics */}
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {seasons.slice(1).map(season => {
            const count = items.filter(i => i.season?.includes(season.id)).length
            const Icon = season.icon
            return (
              <Card key={season.id} className="border-none bg-secondary/30">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <div className={cn("p-2 rounded-xl bg-background border shadow-sm mb-2", season.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{season.label}</span>
                  <span className="text-xl font-bold mt-1">{count} items</span>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Seasonal Filter & Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex bg-secondary/50 p-1 rounded-xl border text-[10px] font-bold uppercase tracking-widest">
            {seasons.map(season => {
              const Icon = season.icon
              const isActive = activeSeason === season.id
              return (
                <button
                  key={season.id}
                  onClick={() => setActiveSeason(season.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                    isActive 
                      ? "bg-background text-foreground shadow-sm" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? season.color : "")} />
                  <span className="hidden sm:inline">{season.label}</span>
                </button>
              )
            })}
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
              {filteredItems.length} Items
            </Badge>
          </div>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-[2.5rem] border-muted">
             <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
             <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">No items found for this season</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredItems.map(item => (
              <Card key={item.id} className="group overflow-hidden rounded-2xl border-none bg-card hover:shadow-xl transition-all duration-300">
                <CardContent className="p-0 relative">
                  <div className="aspect-[3/4] overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <img 
                        src={item.imageUrl} 
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Shirt className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                    <p className="text-[10px] font-bold text-white truncate">{item.name}</p>
                    <div className="flex gap-1 mt-1">
                      {item.season?.map(s => (
                        <div key={s} className="w-1.5 h-1.5 rounded-full bg-primary" title={s} />
                      ))}
                    </div>
                  </div>
                  {item.condition === "needs_wash" && (
                    <div className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500/90 text-white backdrop-blur-sm shadow-lg">
                      <Wind className="w-3 h-3" />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
