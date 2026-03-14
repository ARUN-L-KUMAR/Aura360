"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Coffee, Sun, Moon, Cookie } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditMealDialog } from "./edit-meal-dialog"

interface Meal {
  id: string
  userId: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  foodName: string
  calories: number | null
  protein: number | null
  carbs: number | null
  fats: number | null
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
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

    try {
      const response = await fetch(`/api/food?id=${meal.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete meal")
      }

      toast.success("Meal deleted successfully")
      onDelete(meal.id)
    } catch (error) {
      console.error("Error deleting meal:", error)
      toast.error("Failed to delete meal")
    }

    setIsDeleting(false)
  }

  const mealConfig = {
    breakfast: {
      icon: Coffee,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    lunch: {
      icon: Sun,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    dinner: {
      icon: Moon,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
    snack: {
      icon: Cookie,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      badge: "bg-secondary text-foreground",
    },
  }

  const config = mealConfig[meal.mealType]
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
              <p className="font-medium truncate">{meal.foodName}</p>
              <Badge className={`${config.badge} border-0 capitalize`}>{meal.mealType}</Badge>
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
