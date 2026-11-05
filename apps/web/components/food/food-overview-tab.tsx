"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  UtensilsCrossed,
  Flame,
  Droplets,
  Plus,
  ArrowRight,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Cookie,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { MacroRings } from "./macro-rings"
import { WaterBottle } from "./water-bottle"

interface FoodOverviewTabProps {
  meals: any[]
  onSwitchTab: (tab: string) => void
  onAddMealForType?: (mealType: string) => void
}

export function FoodOverviewTab({
  meals,
  onSwitchTab,
  onAddMealForType,
}: FoodOverviewTabProps) {
  // Water Intake State
  const [waterMl, setWaterMl] = useState(1750)
  const waterTarget = 2500

  const handleAddWater = (ml: number) => {
    setWaterMl((prev) => {
      const next = prev + ml
      toast.success(`+${ml}ml water logged (${next} / ${waterTarget}ml)`)
      return next
    })
  }

  // Filter meals for today
  const todayStr = new Date().toISOString().split("T")[0]
  const todayMeals = useMemo(() => {
    return meals.filter((m) => m.date === todayStr)
  }, [meals, todayStr])

  // Calculated Totals
  const totals = useMemo(() => {
    let cals = 0
    let pro = 0
    let carbs = 0
    let fats = 0

    todayMeals.forEach((m) => {
      cals += Number(m.calories) || 0
      pro += Number(m.protein) || 0
      carbs += Number(m.carbs) || 0
      fats += Number(m.fats) || 0
    })

    return { cals, pro, carbs, fats }
  }, [todayMeals])

  // Targets
  const targetCals = 2200
  const targetPro = 160
  const targetCarbs = 230
  const targetFats = 65

  // Categorize meals by mealType
  const categorized = useMemo(() => {
    return {
      breakfast: todayMeals.filter((m) => m.mealType === "breakfast"),
      lunch: todayMeals.filter((m) => m.mealType === "lunch"),
      dinner: todayMeals.filter((m) => m.mealType === "dinner"),
      snack: todayMeals.filter((m) => m.mealType === "snack"),
    }
  }, [todayMeals])

  const mealBuckets = [
    { type: "breakfast", label: "Breakfast", icon: Coffee, items: categorized.breakfast },
    { type: "lunch", label: "Lunch", icon: Sun, items: categorized.lunch },
    { type: "dinner", label: "Dinner", icon: Moon, items: categorized.dinner },
    { type: "snack", label: "Snacks", icon: Cookie, items: categorized.snack },
  ]

  return (
    <div className="space-y-6">
      {/* Hero: Apple-Style Concentric Macro Rings & Animated Water Bottle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Concentric Macro Rings */}
        <div className="lg:col-span-8 flex flex-col justify-between">
          <MacroRings
            calories={{ current: totals.cals, target: targetCals }}
            protein={{ current: totals.pro, target: targetPro }}
            carbs={{ current: totals.carbs, target: targetCarbs }}
            fats={{ current: totals.fats, target: targetFats }}
          />
        </div>

        {/* Right: Visual Animated Water Bottle */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <WaterBottle
            currentMl={waterMl}
            targetMl={waterTarget}
            onAddWater={handleAddWater}
          />
        </div>
      </div>

      {/* Meal Timeline (Breakfast, Lunch, Dinner, Snacks) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Today's Meal Timeline
          </h3>
          <span className="text-xs text-muted-foreground font-medium">
            Chronological Nutritional Breakdown
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealBuckets.map((bucket) => {
            const Icon = bucket.icon
            const bucketCals = bucket.items.reduce((s, i) => s + (Number(i.calories) || 0), 0)
            const bucketPro = bucket.items.reduce((s, i) => s + (Number(i.protein) || 0), 0)

            return (
              <Card key={bucket.type} className="border-border shadow-sm flex flex-col justify-between">
                <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-primary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-sm">{bucket.label}</h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-muted-foreground">
                        {bucketCals} kcal · {Math.round(bucketPro)}g P
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 space-y-2 flex-1">
                  {bucket.items.length > 0 ? (
                    <div className="space-y-1.5">
                      {bucket.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-xs"
                        >
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {item.foodName}
                          </span>
                          <span className="font-mono text-muted-foreground text-[11px] shrink-0">
                            {item.calories} kcal · {item.protein}g P
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      No items logged for {bucket.label.toLowerCase()} yet.
                    </p>
                  )}
                </CardContent>

                <div className="p-3 border-t bg-muted/10 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (onAddMealForType) onAddMealForType(bucket.type)
                      else onSwitchTab("quick-log")
                    }}
                    className="text-[10px] font-bold uppercase tracking-wider h-7 gap-1 text-primary hover:text-primary"
                  >
                    <Plus className="w-3 h-3" />
                    Add to {bucket.label}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
