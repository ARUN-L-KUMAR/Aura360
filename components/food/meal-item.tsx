"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Coffee, Sun, Moon, Cookie } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditMealDialog } from "./edit-meal-dialog"

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

interface MealItemProps {
  meal: Meal
  onDelete: (mealId: string) => void
  onUpdate: (meal: Meal) => void
}

export function MealItem({ meal, onDelete, onUpdate }: MealItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this meal?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("food").delete().eq("id", meal.id)

    if (error) {
      console.error("[v0] Error deleting meal:", error)
      alert("Failed to delete meal")
    } else {
      onDelete(meal.id)
    }
    setIsDeleting(false)
  }

  const mealConfig = {
    breakfast: {
      icon: Coffee,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
      badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
    },
    lunch: {
      icon: Sun,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
    },
    dinner: {
      icon: Moon,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    },
    snack: {
      icon: Cookie,
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-950/50",
      badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
    },
  }

  const config = mealConfig[meal.meal_type]
  const Icon = config.icon

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{meal.food_name}</p>
              <Badge className={`${config.badge} border-0 capitalize`}>{meal.meal_type}</Badge>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {meal.calories && <span>{meal.calories} cal</span>}
              {meal.protein && <span>P: {meal.protein}g</span>}
              {meal.carbs && <span>C: {meal.carbs}g</span>}
              {meal.fats && <span>F: {meal.fats}g</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(meal.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowEditDialog(true)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <EditMealDialog meal={meal} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
