"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, Edit, Clock } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { EditTimeLogDialog } from "./edit-time-log-dialog"

interface TimeLog {
  id: string
  userId: string
  activity: string
  category: string | null
  duration: number
  date: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface TimeLogItemProps {
  log: TimeLog
  onDelete: (logId: string) => void
  onUpdate: (log: TimeLog) => void
}

export function TimeLogItem({ log, onDelete, onUpdate }: TimeLogItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this time log?")) return

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/time?id=${log.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete time log")
      }

      toast.success("Time log deleted successfully")
      onDelete(log.id)
    } catch (error) {
      console.error("Error deleting time log:", error)
      toast.error("Failed to delete time log")
    }

    setIsDeleting(false)
  }

  const hours = Math.floor(log.duration / 60)
  const minutes = log.duration % 60

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 dark:bg-cyan-950/50 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium truncate">{log.activity}</p>
              {log.category && <Badge variant="secondary">{log.category}</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {hours > 0 && `${hours}h `}
              {minutes}m{log.notes && ` • ${log.notes}`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(log.date).toLocaleDateString("en-US", {
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

      <EditTimeLogDialog log={log} open={showEditDialog} onOpenChange={setShowEditDialog} onUpdate={onUpdate} />
    </>
  )
}
