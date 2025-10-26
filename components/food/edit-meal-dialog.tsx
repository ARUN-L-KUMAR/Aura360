"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

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

interface EditMealDialogProps {
  meal: Meal
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (meal: Meal) => void
}

export function EditMealDialog({ meal, open, onOpenChange, onUpdate }: EditMealDialogProps) {
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(meal.meal_type)
  const [foodName, setFoodName] = useState(meal.food_name)
  const [calories, setCalories] = useState(meal.calories?.toString() || "")
  const [protein, setProtein] = useState(meal.protein?.toString() || "")
  const [carbs, setCarbs] = useState(meal.carbs?.toString() || "")
  const [fats, setFats] = useState(meal.fats?.toString() || "")
  const [date, setDate] = useState(meal.date)
  const [notes, setNotes] = useState(meal.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMealType(meal.meal_type)
    setFoodName(meal.food_name)
    setCalories(meal.calories?.toString() || "")
    setProtein(meal.protein?.toString() || "")
    setCarbs(meal.carbs?.toString() || "")
    setFats(meal.fats?.toString() || "")
    setDate(meal.date)
    setNotes(meal.notes || "")
  }, [meal])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("food")
      .update({
        meal_type: mealType,
        food_name: foodName,
        calories: calories ? Number.parseInt(calories) : null,
        protein: protein ? Number.parseFloat(protein) : null,
        carbs: carbs ? Number.parseFloat(carbs) : null,
        fats: fats ? Number.parseFloat(fats) : null,
        date,
        notes: notes || null,
      })
      .eq("id", meal.id)
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating meal:", error)
      alert("Failed to update meal")
    } else if (data) {
      onUpdate(data)
      onOpenChange(false)
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Meal</DialogTitle>
            <DialogDescription>Make changes to your meal</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-meal-type">Meal Type</Label>
              <Select
                value={mealType}
                onValueChange={(value: "breakfast" | "lunch" | "dinner" | "snack") => setMealType(value)}
              >
                <SelectTrigger id="edit-meal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-food-name">Food Name</Label>
              <Input
                id="edit-food-name"
                placeholder="e.g., Grilled Chicken Salad"
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-calories">Calories</Label>
                <Input
                  id="edit-calories"
                  type="number"
                  placeholder="500"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-protein">Protein (g)</Label>
                <Input
                  id="edit-protein"
                  type="number"
                  step="0.1"
                  placeholder="30"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-carbs">Carbs (g)</Label>
                <Input
                  id="edit-carbs"
                  type="number"
                  step="0.1"
                  placeholder="45"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-fats">Fats (g)</Label>
                <Input
                  id="edit-fats"
                  type="number"
                  step="0.1"
                  placeholder="15"
                  value={fats}
                  onChange={(e) => setFats(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
