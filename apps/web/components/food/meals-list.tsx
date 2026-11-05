"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MealItem } from "./meal-item"
// Local interface aligned with MealItem's expected Meal shape
interface Meal {
  id: string
  userId: string
  workspaceId?: string
  mealType: "breakfast" | "lunch" | "dinner" | "snack"
  foodName: string
  calories: number | null | undefined
  protein: number | string | null | undefined
  carbs: number | string | null | undefined
  fats: number | string | null | undefined
  date: string | Date
  notes: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface MealsListProps {
  initialMeals: Meal[]
}

export function MealsList({ initialMeals }: MealsListProps) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals)
  const [filterType, setFilterType] = useState<string>("all")

  const filteredMeals = meals.filter((meal) => filterType === "all" || meal.mealType === filterType)

  const handleMealDeleted = (mealId: string) => {
    setMeals((prev) => prev.filter((meal) => meal.id !== mealId))
  }

  const handleMealUpdated = (updatedMeal: Meal) => {
    setMeals((prev) => prev.map((meal) => (meal.id === updatedMeal.id ? updatedMeal : meal)))
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Meals Log</CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by meal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Meals</SelectItem>
              <SelectItem value="breakfast">Breakfast</SelectItem>
              <SelectItem value="lunch">Lunch</SelectItem>
              <SelectItem value="dinner">Dinner</SelectItem>
              <SelectItem value="snack">Snack</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredMeals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {filterType !== "all" ? "No meals found matching your filter." : "No meals logged yet. Start tracking!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredMeals.map((meal) => (
              <MealItem key={meal.id} meal={meal as any} onDelete={handleMealDeleted} onUpdate={handleMealUpdated as any} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
