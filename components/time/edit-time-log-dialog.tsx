"use client"

import type React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

interface TimeLog {
  id: string
  user_id: string
  activity: string
  category: string | null
  duration_minutes: number
  date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface EditTimeLogDialogProps {
  log: TimeLog
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (log: TimeLog) => void
}

export function EditTimeLogDialog({ log, open, onOpenChange, onUpdate }: EditTimeLogDialogProps) {
  const [activity, setActivity] = useState(log.activity)
  const [category, setCategory] = useState(log.category || "")
  const [duration, setDuration] = useState(log.duration_minutes.toString())
  const [date, setDate] = useState(log.date)
  const [notes, setNotes] = useState(log.notes || "")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setActivity(log.activity)
    setCategory(log.category || "")
    setDuration(log.duration_minutes.toString())
    setDate(log.date)
    setNotes(log.notes || "")
  }, [log])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()

    const { data, error } = await supabase
      .from("time_logs")
      .update({
        activity,
        category: category || null,
        duration_minutes: Number.parseInt(duration),
        date,
        notes: notes || null,
      })
      .eq("id", log.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating time log:", error)
      alert("Failed to update log")
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
            <DialogTitle>Edit Time Log</DialogTitle>
            <DialogDescription>Make changes to your time log</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-activity">Activity</Label>
              <Input
                id="edit-activity"
                placeholder="e.g., Reading, Coding, Exercise"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-category">Category (Optional)</Label>
              <Input
                id="edit-category"
                placeholder="e.g., Work, Personal, Learning"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-duration">Duration (minutes)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  placeholder="60"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input id="edit-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
