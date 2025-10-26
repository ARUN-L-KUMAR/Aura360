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
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface AddFitnessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddFitnessDialog({ open, onOpenChange }: AddFitnessDialogProps) {
  const [type, setType] = useState<"workout" | "measurement" | "goal">("workout")
  const [workoutType, setWorkoutType] = useState("")
  const [duration, setDuration] = useState("")
  const [calories, setCalories] = useState("")
  const [measurementType, setMeasurementType] = useState("")
  const [measurementValue, setMeasurementValue] = useState("")
  const [measurementUnit, setMeasurementUnit] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      alert("You must be logged in to add a fitness entry")
      setIsLoading(false)
      return
    }

    const entryData: any = {
      user_id: user.id,
      type,
      date,
      notes: notes || null,
    }

    if (type === "workout") {
      entryData.workout_type = workoutType
      entryData.duration_minutes = duration ? Number.parseInt(duration) : null
      entryData.calories_burned = calories ? Number.parseInt(calories) : null
    } else if (type === "measurement") {
      entryData.measurement_type = measurementType
      entryData.measurement_value = measurementValue ? Number.parseFloat(measurementValue) : null
      entryData.measurement_unit = measurementUnit
    }

    const { error } = await supabase.from("fitness").insert(entryData)

    if (error) {
      console.error("[v0] Error creating fitness entry:", error)
      alert("Failed to create entry")
    } else {
      resetForm()
      onOpenChange(false)
      router.refresh()
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setType("workout")
    setWorkoutType("")
    setDuration("")
    setCalories("")
    setMeasurementType("")
    setMeasurementValue("")
    setMeasurementUnit("")
    setDate(new Date().toISOString().split("T")[0])
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Fitness Entry</DialogTitle>
            <DialogDescription>Track your workout, measurement, or goal</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(value: "workout" | "measurement" | "goal") => setType(value)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workout">Workout</SelectItem>
                  <SelectItem value="measurement">Measurement</SelectItem>
                  <SelectItem value="goal">Goal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === "workout" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="workout-type">Workout Type</Label>
                  <Input
                    id="workout-type"
                    placeholder="e.g., Running, Weightlifting"
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="200"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {type === "measurement" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="measurement-type">Measurement Type</Label>
                  <Input
                    id="measurement-type"
                    placeholder="e.g., Weight, Body Fat %"
                    value={measurementType}
                    onChange={(e) => setMeasurementType(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="measurement-value">Value</Label>
                    <Input
                      id="measurement-value"
                      type="number"
                      step="0.1"
                      placeholder="150"
                      value={measurementValue}
                      onChange={(e) => setMeasurementValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="measurement-unit">Unit</Label>
                    <Input
                      id="measurement-unit"
                      placeholder="lbs, kg, %"
                      value={measurementUnit}
                      onChange={(e) => setMeasurementUnit(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">{type === "goal" ? "Goal Description" : "Notes (Optional)"}</Label>
              <Textarea
                id="notes"
                placeholder={type === "goal" ? "Describe your fitness goal..." : "Add any additional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                required={type === "goal"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-purple-600 hover:bg-purple-700">
              {isLoading ? "Adding..." : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
