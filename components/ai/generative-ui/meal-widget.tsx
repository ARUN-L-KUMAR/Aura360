"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UtensilsCrossed, Check, Plus, Flame, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface MealWidgetProps {
  data: {
    mealTitle?: string
    mealType?: "breakfast" | "lunch" | "dinner" | "snack"
    calories?: number
    protein?: number
    carbs?: number
    fats?: number
    items?: Array<{
      name: string
      portion?: string
      calories?: number
      protein?: number
    }>
  }
}

export function GenerativeMealWidget({ data }: MealWidgetProps) {
  const [isLogged, setIsLogged] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const mealType = data.mealType || "lunch"

  const handleLogMeal = async () => {
    setIsLoading(true)
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          mealType: mealType,
          foodName: data.mealTitle || "AI Nutrition Meal",
          quantity: 1,
          unit: "serving",
          calories: data.calories || 450,
          protein: data.protein || 30,
          carbs: data.carbs || 40,
          fats: data.fats || 15,
          notes: `Logged directly from AI Assistant: ${data.items?.map((i) => i.name).join(", ") || ""}`,
        }),
      })

      if (!res.ok) throw new Error("Failed to log meal")

      setIsLogged(true)
      toast.success(`Logged "${data.mealTitle || "Meal"}" to ${mealType}!`, { icon: "🥗" })
    } catch (err) {
      console.error(err)
      toast.error("Failed to log meal")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="my-3 border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-md overflow-hidden text-xs">
      <CardHeader className="p-3.5 pb-2.5 border-b bg-emerald-500/5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                AI Meal Spec · {mealType}
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground pt-1">
              {data.mealTitle || "Nutritional Meal"}
            </CardTitle>
          </div>

          <Button
            size="sm"
            onClick={handleLogMeal}
            disabled={isLogged || isLoading}
            className={cn(
              "h-8 px-3 text-[10px] font-bold uppercase tracking-wider gap-1.5 shrink-0 transition-all",
              isLogged
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : "bg-primary text-primary-foreground"
            )}
          >
            {isLogged ? (
              <>
                <Check className="w-3 h-3 stroke-[3]" />
                Logged
              </>
            ) : (
              <>
                <Plus className="w-3 h-3" />
                {isLoading ? "Logging..." : "Log to Meals"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-3">
        {/* Macro Gauge Pill */}
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-secondary/50 border font-mono text-center text-xs">
          <div>
            <span className="text-[9px] uppercase font-bold text-muted-foreground block">Calories</span>
            <span className="font-bold text-foreground">{data.calories || 450}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Protein</span>
            <span className="font-bold text-foreground">{data.protein || 30}g</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-amber-500 block">Carbs</span>
            <span className="font-bold text-foreground">{data.carbs || 40}g</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-sky-500 block">Fats</span>
            <span className="font-bold text-foreground">{data.fats || 15}g</span>
          </div>
        </div>

        {/* Food Items Breakdown */}
        {data.items && data.items.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Ingredients & Portions
            </span>
            <div className="space-y-1">
              {data.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-secondary/30 text-xs">
                  <span className="font-medium text-foreground">{item.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {item.portion || "1 serving"} {item.protein ? `· ${item.protein}g P` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
