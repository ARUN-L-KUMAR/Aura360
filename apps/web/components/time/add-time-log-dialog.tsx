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
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface AddTimeLogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddTimeLogDialog({ open, onOpenChange }: AddTimeLogDialogProps) {
  const [activity, setActivity] = useState("")
  const [category, setCategory] = useState("")
  const [duration, setDuration] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity,
          category: category || undefined,
          duration: Number.parseInt(duration),
          date,
          description: notes || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to create time log")
      }

      toast.success("Time log added successfully")
      resetForm()
      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error("[Time] Error creating log:", error)
      toast.error("Failed to create time log")
    }

    setIsLoading(false)
  }

  const resetForm = () => {
    setActivity("")
    setCategory("")
    setDuration("")
    setDate(new Date().toISOString().split("T")[0])
    setNotes("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Time Log</DialogTitle>
            <DialogDescription>Track time spent on an activity</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="activity">Activity</Label>
              <Input
                id="activity"
                placeholder="e.g., Reading, Coding, Exercise"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                placeholder="e.g., Work, Personal, Learning"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-700">
              {isLoading ? "Adding..." : "Add Log"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
