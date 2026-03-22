"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TimeLogItem } from "./time-log-item"
// Local interface aligned with TimeLogItem's expected TimeLog shape
interface TimeLog {
  id: string
  userId: string
  workspaceId?: string
  activity: string
  category: string | null | undefined
  duration: number
  date: string | Date
  description: string | null | undefined
  startTime?: Date | string | null
  endTime?: Date | string | null
  tags?: string[] | null
  productivityScore?: number | null
  metadata?: Record<string, any> | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface TimeLogsListProps {
  initialLogs: TimeLog[]
}

export function TimeLogsList({ initialLogs }: TimeLogsListProps) {
  const [logs, setLogs] = useState<TimeLog[]>(initialLogs)

  const handleLogDeleted = (logId: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== logId))
  }

  const handleLogUpdated = (updatedLog: TimeLog) => {
    setLogs((prev) => prev.map((log) => (log.id === updatedLog.id ? updatedLog : log)))
  }

  const totalMinutes = logs.reduce((sum, log) => sum + log.duration, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const remainingMinutes = totalMinutes % 60

  return (
    <div className="space-y-6">
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader>
          <CardTitle>Total Time Tracked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {totalHours}h {remainingMinutes}m
          </div>
          <p className="text-sm text-muted-foreground mt-1">{logs.length} activities logged</p>
        </CardContent>
      </Card>

      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No time logs yet. Start tracking your activities!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <TimeLogItem key={log.id} log={log as any} onDelete={handleLogDeleted} onUpdate={handleLogUpdated as any} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
