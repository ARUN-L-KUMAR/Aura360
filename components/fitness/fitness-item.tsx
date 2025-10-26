"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Activity, Ruler, Target } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EditFitnessDialog } from "./edit-fitness-dialog"

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

interface FitnessItemProps {
  entry: FitnessEntry
  onDelete: (entryId: string) => void
  onUpdate: (entry: FitnessEntry) => void
}

export function FitnessItem({ entry, onDelete, onUpdate }: FitnessItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    setIsDeleting(true)
    const supabase = createClient()

    const { error } = await supabase.from("fitness").delete().eq("id", entry.id)

    if (error) {
      console.error("[v0] Error deleting fitness entry:", error)
      alert("Failed to delete entry")
    } else {
      onDelete(entry.id)
    }
    setIsDeleting(false)
  }

  const typeConfig = {
    workout: {
      icon: Activity,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    },
    measurement: {
      icon: Ruler,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
    goal: {
      icon: Target,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/50",
      badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
    },
  }

  const config = typeConfig[entry.type]
  const Icon = config.icon

  const getDisplayText = () => {
    if (entry.type === "workout") {
      return `${entry.workout_type} - ${entry.duration_minutes} min${entry.calories_burned ? `, ${entry.calories_burned} cal` : ""}`
    }
    if (entry.type === "measurement") {
      return `${entry.measurement_type}: ${entry.measurement_value} ${entry.measurement_unit}`
    }
    return entry.notes || "Goal"
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
            <Icon className={`w-5 h-5 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{getDisplayText()}</p>
              <Badge className={`${config.badge} border-0`}>{entry.type}</Badge>
            </div>
            {entry.notes && entry.type !== "goal" && (
              <p className="text-sm text-muted-foreground truncate">{entry.notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(entry.date).toLocaleDateString("en-US", {
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

      <EditFitnessDialog entry={entry} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
