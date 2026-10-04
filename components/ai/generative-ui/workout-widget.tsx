"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dumbbell, Play, Check, Clock, Flame, ChevronRight, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export interface WorkoutWidgetProps {
  data: {
    title?: string
    focus?: string
    durationMinutes?: number
    estimatedCalories?: number
    exercises?: Array<{
      name: string
      sets?: number | string
      reps?: number | string
      restSeconds?: number
      notes?: string
    }>
  }
}

export function GenerativeWorkoutWidget({ data }: WorkoutWidgetProps) {
  const router = useRouter()
  const [completedItems, setCompletedItems] = useState<Record<number, boolean>>({})

  const exercises = data.exercises || [
    { name: "Barbell Bench Press", sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Incline Dumbbell Press", sets: 3, reps: "10-12", restSeconds: 75 },
    { name: "Overhead Shoulder Press", sets: 3, reps: "10", restSeconds: 60 },
  ]

  const toggleExercise = (index: number) => {
    setCompletedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const handleLaunchLiveSession = () => {
    try {
      // Store in sessionStorage so fitness page can automatically pick it up
      sessionStorage.setItem(
        "aura_pending_workout",
        JSON.stringify({
          name: data.title || "AI Generated Workout Session",
          exercises: exercises,
        })
      )
    } catch {}

    toast.success("Launching routine in Live Workout Tracker...")
    router.push("/dashboard/fitness")
  }

  return (
    <Card className="my-3 border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-md overflow-hidden text-xs">
      <CardHeader className="p-3.5 pb-2.5 border-b bg-primary/5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded-md bg-primary/10 text-primary">
                <Dumbbell className="w-3.5 h-3.5" />
              </div>
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider text-primary border-primary/30">
                Interactive Workout Blueprint
              </Badge>
            </div>
            <CardTitle className="text-sm font-bold tracking-tight text-foreground pt-1">
              {data.title || "Custom Workout Routine"}
            </CardTitle>
            <CardDescription className="text-[11px]">
              {data.focus || "Targeted Hypertrophy & Strength"} · {data.durationMinutes || 45} mins
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={handleLaunchLiveSession}
            className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider gap-1.5 bg-primary text-primary-foreground shadow-xs shrink-0"
          >
            <Play className="w-3 h-3 fill-current" />
            Launch Live
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 space-y-2">
        <div className="space-y-1.5">
          {exercises.map((ex, idx) => {
            const isDone = completedItems[idx]

            return (
              <div
                key={idx}
                onClick={() => toggleExercise(idx)}
                className={cn(
                  "p-2 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2",
                  isDone
                    ? "bg-emerald-500/10 border-emerald-500/30 text-muted-foreground line-through"
                    : "bg-secondary/40 hover:bg-secondary/80 border-border text-foreground"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={cn(
                      "w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0",
                      isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-border bg-background"
                    )}
                  >
                    {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="font-semibold text-xs truncate">{ex.name}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px] text-muted-foreground">
                  <span className="font-bold text-foreground">
                    {ex.sets} × {ex.reps}
                  </span>
                  {ex.restSeconds && (
                    <span className="opacity-70">({ex.restSeconds}s rest)</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="pt-2 border-t flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Tap items to check off or click Launch Live to track weights</span>
          <span className="font-bold text-primary">
            {Object.values(completedItems).filter(Boolean).length}/{exercises.length} Done
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
