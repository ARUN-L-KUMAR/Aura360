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

interface FitnessEntry {
  id: string
  userId: string
  type: "workout" | "measurement" | "goal"
  workoutType: string | null
  durationMinutes: number | null
  caloriesBurned: number | null
  measurementType: string | null
  measurementValue: number | null
  measurementUnit: string | null
  date: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface EditFitnessDialogProps {
  entry: FitnessEntry
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (entry: FitnessEntry) => void
}

export function EditFitnessDialog({ entry, open, onOpenChange, onUpdate }: EditFitnessDialogProps) {
  const [type, setType] = useState<"workout" | "measurement" | "goal">(entry.type)
  const [workoutType, setWorkoutType] = useState(entry.workoutType || "")
  const [duration, setDuration] = useState(entry.durationMinutes?.toString() || "")
  const [calories, setCalories] = useState(entry.caloriesBurned?.toString() || "")
  const [measurementType, setMeasurementType] = useState(entry.measurementType || "")
  const [measurementValue, setMeasurementValue] = useState(entry.measurementValue?.toString() || "")
  const [measurementUnit, setMeasurementUnit] = useState(entry.measurementUnit || "")
  const [date, setDate] = useState(entry.date)
  const [notes, setNotes] = useState(entry.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setType(entry.type)
    setWorkoutType(entry.workoutType || "")
    setDuration(entry.durationMinutes?.toString() || "")
    setCalories(entry.caloriesBurned?.toString() || "")
    setMeasurementType(entry.measurementType || "")
    setMeasurementValue(entry.measurementValue?.toString() || "")
    setMeasurementUnit(entry.measurementUnit || "")
    setDate(entry.date)
    setNotes(entry.notes || "")
  }, [entry])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const entryData: any = {
        type,
        date,
        notes: notes || undefined,
        workoutType: undefined,
        durationMinutes: undefined,
        caloriesBurned: undefined,
        measurementType: undefined,
        measurementValue: undefined,
        measurementUnit: undefined,
      }

      if (type === "workout") {
        entryData.workoutType = workoutType
        entryData.durationMinutes = duration ? Number.parseInt(duration) : undefined
        entryData.caloriesBurned = calories ? Number.parseInt(calories) : undefined
      } else if (type === "measurement") {
        entryData.measurementType = measurementType
        entryData.measurementValue = measurementValue ? Number.parseFloat(measurementValue) : undefined
        entryData.measurementUnit = measurementUnit
      }

      const response = await fetch(`/api/fitness?id=${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      })

      if (!response.ok) {
        throw new Error("Failed to update fitness entry")
      }

      const data = await response.json()
      toast.success("Fitness entry updated successfully")
      onUpdate(data)
      onOpenChange(false)
    } catch (error) {
      console.error("Error updating fitness entry:", error)
      toast.error("Failed to update entry")
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
