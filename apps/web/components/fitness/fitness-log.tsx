"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FitnessItem } from "./fitness-item"
// Local interface aligned with FitnessItem's expected FitnessEntry shape
interface FitnessEntry {
  id: string
  userId: string
  workspaceId?: string
  type: "workout" | "measurement" | "goal"
  workoutType: string | null
  durationMinutes: number | null
  caloriesBurned: number | null
  measurementType: string | null
  measurementValue: string | number | null
  measurementUnit: string | null
  date: string | Date
  notes: string | null
  intensity?: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

interface FitnessLogProps {
  initialData: FitnessEntry[]
}

export function FitnessLog({ initialData }: FitnessLogProps) {
  const [data, setData] = useState<FitnessEntry[]>(initialData)
  const [filterType, setFilterType] = useState<string>("all")

  const filteredData = data.filter((entry) => filterType === "all" || entry.type === filterType)

  const handleEntryDeleted = (entryId: string) => {
    setData((prev) => prev.filter((entry) => entry.id !== entryId))
  }

  const handleEntryUpdated = (updatedEntry: FitnessEntry) => {
    setData((prev) => prev.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry)))
  }

  return (
    <Card className="backdrop-blur-sm bg-card/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Fitness Log</CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="workout">Workouts</SelectItem>
              <SelectItem value="measurement">Measurements</SelectItem>
              <SelectItem value="goal">Goals</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredData.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {filterType !== "all"
                ? "No entries found matching your filter."
                : "No fitness entries yet. Start tracking your progress!"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredData.map((entry) => (
              <FitnessItem key={entry.id} entry={entry as any} onDelete={handleEntryDeleted} onUpdate={handleEntryUpdated as any} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
