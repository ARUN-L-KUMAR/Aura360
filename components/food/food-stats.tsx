"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flame, Beef, Wheat, Droplet } from "lucide-react"
import { useMemo } from "react"

interface Meal {
  id: string
  user_id: string
  meal_type: "breakfast" | "lunch" | "dinner" | "snack"
  food_name: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface FoodStatsProps {
  meals: Meal[]
}

export function FoodStats({ meals }: FoodStatsProps) {
  const stats = useMemo(() => {
    const totalCalories = meals.reduce((sum, meal) => sum + (meal.calories || 0), 0)
    const totalProtein = meals.reduce((sum, meal) => sum + (Number(meal.protein) || 0), 0)
    const totalCarbs = meals.reduce((sum, meal) => sum + (Number(meal.carbs) || 0), 0)
    const totalFats = meals.reduce((sum, meal) => sum + (Number(meal.fats) || 0), 0)

    return { totalCalories, totalProtein, totalCarbs, totalFats }
  }, [meals])

  const cards = [
    {
      title: "Total Calories",
      value: stats.totalCalories,
      icon: Flame,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
      suffix: " cal",
    },
    {
      title: "Protein",
      value: stats.totalProtein,
      icon: Beef,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/50",
      suffix: "g",
    },
    {
      title: "Carbs",
      value: stats.totalCarbs,
      icon: Wheat,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
      suffix: "g",
    },
    {
      title: "Fats",
      value: stats.totalFats,
      icon: Droplet,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      suffix: "g",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="backdrop-blur-sm bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.value.toLocaleString()}
                {card.suffix}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
