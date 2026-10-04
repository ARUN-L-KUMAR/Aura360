"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Flame, RotateCcw, Activity, Sparkles, Dumbbell } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MuscleGroupStatus {
  id: string
  name: string
  view: "front" | "back"
  recoveryScore: number // 0 to 100
  status: "recovered" | "recovering" | "fatigued"
  lastTrained: string
  recommendedExercises: string[]
}

const DEFAULT_MUSCLES: MuscleGroupStatus[] = [
  {
    id: "chest",
    name: "Chest (Pectorals)",
    view: "front",
    recoveryScore: 92,
    status: "recovered",
    lastTrained: "3 days ago",
    recommendedExercises: ["Barbell Bench Press", "Incline Dumbbell Press", "Cable Flyes"],
  },
  {
    id: "shoulders",
    name: "Shoulders (Deltoids)",
    view: "front",
    recoveryScore: 88,
    status: "recovered",
    lastTrained: "3 days ago",
    recommendedExercises: ["Overhead Press", "Lateral Raises", "Face Pulls"],
  },
  {
    id: "biceps",
    name: "Biceps",
    view: "front",
    recoveryScore: 95,
    status: "recovered",
    lastTrained: "4 days ago",
    recommendedExercises: ["Incline DB Curls", "Hammer Curls", "Barbell Preacher Curls"],
  },
  {
    id: "abs",
    name: "Core & Abdominals",
    view: "front",
    recoveryScore: 78,
    status: "recovering",
    lastTrained: "Yesterday",
    recommendedExercises: ["Hanging Leg Raises", "Cable Crunches", "Ab Wheel Rollouts"],
  },
  {
    id: "quads",
    name: "Quadriceps",
    view: "front",
    recoveryScore: 68,
    status: "recovering",
    lastTrained: "Yesterday",
    recommendedExercises: ["Barbell Back Squats", "Leg Press", "Bulgarian Split Squats"],
  },
  {
    id: "calves",
    name: "Calves",
    view: "front",
    recoveryScore: 90,
    status: "recovered",
    lastTrained: "3 days ago",
    recommendedExercises: ["Standing Calf Raises", "Seated Calf Raises"],
  },
  {
    id: "lats",
    name: "Lats & Upper Back",
    view: "back",
    recoveryScore: 94,
    status: "recovered",
    lastTrained: "4 days ago",
    recommendedExercises: ["Pull-ups", "Lat Pulldown", "Bent-Over Barbell Row"],
  },
  {
    id: "triceps",
    name: "Triceps",
    view: "back",
    recoveryScore: 85,
    status: "recovered",
    lastTrained: "3 days ago",
    recommendedExercises: ["Skull Crushers", "Rope Pushdowns", "Dips"],
  },
  {
    id: "glutes",
    name: "Glutes & Hips",
    view: "back",
    recoveryScore: 70,
    status: "recovering",
    lastTrained: "Yesterday",
    recommendedExercises: ["Barbell Hip Thrusts", "Romanian Deadlifts", "Walking Lunges"],
  },
  {
    id: "hamstrings",
    name: "Hamstrings",
    view: "back",
    recoveryScore: 72,
    status: "recovering",
    lastTrained: "Yesterday",
    recommendedExercises: ["Lying Leg Curls", "Romanian Deadlifts", "Glute-Ham Raises"],
  },
]

export function MuscleHeatmap() {
  const [activeView, setActiveView] = useState<"front" | "back">("front")
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroupStatus>(DEFAULT_MUSCLES[0])

  const filteredMuscles = DEFAULT_MUSCLES.filter((m) => m.view === activeView)

  return (
    <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden">
      <CardHeader className="p-5 pb-3 border-b bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <CardTitle className="text-base font-bold tracking-tight">
                Interactive Muscle Recovery Heatmap
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Visual biomechanical readiness across major muscle chains based on training history.
            </CardDescription>
          </div>

          {/* Front / Back View Switcher */}
          <div className="flex bg-secondary p-1 rounded-xl border text-xs font-bold uppercase tracking-wider">
            <button
              onClick={() => setActiveView("front")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeView === "front"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Anterior (Front)
            </button>
            <button
              onClick={() => setActiveView("back")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                activeView === "back"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Posterior (Back)
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Interactive Muscle Group Cards */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
              <span>Muscle Group</span>
              <span>Recovery Status</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredMuscles.map((muscle) => {
                const isSelected = selectedMuscle.id === muscle.id
                const isGreen = muscle.recoveryScore >= 85
                const isOrange = muscle.recoveryScore >= 70 && muscle.recoveryScore < 85

                return (
                  <div
                    key={muscle.id}
                    onClick={() => setSelectedMuscle(muscle)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs",
                      isSelected
                        ? "bg-card border-primary ring-2 ring-primary/30 shadow-md scale-102"
                        : "bg-secondary/40 hover:bg-secondary/80 border-border/80"
                    )}
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            isGreen
                              ? "bg-emerald-500 animate-pulse"
                              : isOrange
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          )}
                        />
                        <h4 className="font-bold truncate text-foreground">{muscle.name}</h4>
                      </div>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        Last trained: {muscle.lastTrained}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "font-mono font-bold text-xs",
                          isGreen
                            ? "text-emerald-600 dark:text-emerald-400"
                            : isOrange
                            ? "text-amber-500"
                            : "text-rose-500"
                        )}
                      >
                        {muscle.recoveryScore}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Selected Muscle Deep-Dive Card */}
          <div className="lg:col-span-5">
            {selectedMuscle && (
              <div className="p-4 rounded-2xl border border-primary/20 bg-secondary/30 backdrop-blur-md space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider mb-1">
                      Biomechanical Status
                    </Badge>
                    <h4 className="font-black text-lg tracking-tight text-foreground">
                      {selectedMuscle.name}
                    </h4>
                    <span className="text-xs text-muted-foreground">
                      Recovery: {selectedMuscle.recoveryScore}% · {selectedMuscle.status === "recovered" ? "🟢 Fully Primed" : "🟠 Active Repair Window"}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-background border text-center shrink-0">
                    <span className="text-[9px] font-bold uppercase text-muted-foreground block">
                      Readiness
                    </span>
                    <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                      {selectedMuscle.recoveryScore}%
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <Dumbbell className="w-3.5 h-3.5" />
                    Recommended Stimulus Exercises
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMuscle.recommendedExercises.map((ex) => (
                      <Badge key={ex} variant="secondary" className="text-[11px] font-medium">
                        {ex}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-background/80 border text-[11px] text-muted-foreground leading-relaxed">
                  💡 <span className="font-medium text-foreground">Recovery Insight:</span>{" "}
                  {selectedMuscle.recoveryScore >= 85
                    ? "Muscle fibers have replenished full glycogen reserves and neural drive is 100%. Ideal candidate for progressive overload."
                    : "Protein synthesis and microscopic muscle repair in progress. Recommend 24 hours before heavy loading."}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
