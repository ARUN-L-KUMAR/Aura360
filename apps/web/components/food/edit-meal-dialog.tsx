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
import { toast } from "sonner"

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

interface EditMealDialogProps {
  meal: Meal
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (meal: Meal) => void
}

export function EditMealDialog({ meal, open, onOpenChange, onUpdate }: EditMealDialogProps) {
  const [mealType, setMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack">(meal.mealType)
  const [foodName, setFoodName] = useState(meal.foodName)
  const [calories, setCalories] = useState(meal.calories?.toString() || "")
  const [protein, setProtein] = useState(meal.protein?.toString() || "")
  const [carbs, setCarbs] = useState(meal.carbs?.toString() || "")
  const [fats, setFats] = useState(meal.fats?.toString() || "")
  const [date, setDate] = useState(meal.date)
  const [notes, setNotes] = useState(meal.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setMealType(meal.mealType)
    setFoodName(meal.foodName)
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

    try {
      const response = await fetch(`/api/food?id=${meal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealType,
          foodName,
          calories: calories ? Number.parseInt(calories) : undefined,
          protein: protein ? Number.parseFloat(protein) : undefined,
          carbs: carbs ? Number.parseFloat(carbs) : undefined,
          fats: fats ? Number.parseFloat(fats) : undefined,
          date,
          notes: notes || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update meal")
      }

      const data = await response.json()
      toast.success("Meal updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating meal:", error)
      toast.error("Failed to update meal")
    } finally {
      setIsLoading(false)
    }
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
