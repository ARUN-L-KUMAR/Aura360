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

interface FitnessEntry {
  id: string
  user_id: string
  type: "workout" | "measurement" | "goal"
  workout_type: string | null
  duration_minutes: number | null
  calories_burned: number | null
  measurement_type: string | null
  measurement_value: number | null
  measurement_unit: string | null
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface EditFitnessDialogProps {
  entry: FitnessEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (entry: FitnessEntry) => void
}

export function EditFitnessDialog({ entry, open, onOpenChange, onUpdate }: EditFitnessDialogProps) {
  const [type, setType] = useState<"workout" | "measurement" | "goal">(entry.type)
  const [workoutType, setWorkoutType] = useState(entry.workout_type || "")
  const [duration, setDuration] = useState(entry.duration_minutes?.toString() || "")
  const [calories, setCalories] = useState(entry.calories_burned?.toString() || "")
  const [measurementType, setMeasurementType] = useState(entry.measurement_type || "")
  const [measurementValue, setMeasurementValue] = useState(entry.measurement_value?.toString() || "")
  const [measurementUnit, setMeasurementUnit] = useState(entry.measurement_unit || "")
  const [date, setDate] = useState(entry.date)
  const [notes, setNotes] = useState(entry.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setType(entry.type)
    setWorkoutType(entry.workout_type || "")
    setDuration(entry.duration_minutes?.toString() || "")
    setCalories(entry.calories_burned?.toString() || "")
    setMeasurementType(entry.measurement_type || "")
    setMeasurementValue(entry.measurement_value?.toString() || "")
    setMeasurementUnit(entry.measurement_unit || "")
    setDate(entry.date)
    setNotes(entry.notes || "")
  }, [entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const entryData: any = {
      type,
      date,
      notes: notes || null,
      workout_type: null,
      duration_minutes: null,
      calories_burned: null,
      measurement_type: null,
      measurement_value: null,
      measurement_unit: null,
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

    const { data, error } = await supabase.from("fitness").update(entryData).eq("id", entry.id).select().single()

    if (error) {
      console.error("[v0] Error updating fitness entry:", error)
      alert("Failed to update entry")
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
            <DialogTitle>Edit Fitness Entry</DialogTitle>
            <DialogDescription>Make changes to your fitness entry</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={type} onValueChange={(value: "workout" | "measurement" | "goal") => setType(value)}>
                <SelectTrigger id="edit-type">
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
                  <Label htmlFor="edit-workout-type">Workout Type</Label>
                  <Input
                    id="edit-workout-type"
                    placeholder="e.g., Running, Weightlifting"
                    value={workoutType}
                    onChange={(e) => setWorkoutType(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-duration">Duration (min)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      placeholder="30"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-calories">Calories</Label>
                    <Input
                      id="edit-calories"
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
                  <Label htmlFor="edit-measurement-type">Measurement Type</Label>
                  <Input
                    id="edit-measurement-type"
                    placeholder="e.g., Weight, Body Fat %"
                    value={measurementType}
                    onChange={(e) => setMeasurementType(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-measurement-value">Value</Label>
                    <Input
                      id="edit-measurement-value"
                      type="number"
                      step="0.1"
                      placeholder="150"
                      value={measurementValue}
                      onChange={(e) => setMeasurementValue(e.target.value)}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-measurement-unit">Unit</Label>
                    <Input
                      id="edit-measurement-unit"
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
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">{type === "goal" ? "Goal Description" : "Notes (Optional)"}</Label>
              <Textarea
                id="edit-notes"
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
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
