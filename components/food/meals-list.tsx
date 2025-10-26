"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MealItem } from "./meal-item"

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

interface MealsListProps {
  initialMeals: Meal[]
}

export function MealsList({ initialMeals }: MealsListProps) {
  const [meals, setMeals] = useState<Meal[]>(initialMeals)
  const [filterType, setFilterType] = useState<string>("all")

  const filteredMeals = meals.filter((meal) => filterType === "all" || meal.meal_type === filterType)

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
              <MealItem key={meal.id} meal={meal} onDelete={handleMealDeleted} onUpdate={handleMealUpdated} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
