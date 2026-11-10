"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Play,
  Pause,
  RotateCcw,
  Check,
  Plus,
  Trash2,
  Timer,
  Flame,
  Dumbbell,
  Trophy,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Activity,
  Layers,
  Save,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { RestTimerRing } from "./rest-timer-ring"

export interface LiveSetItem {
  setNumber: number
  weight: number
  reps: number
  completed: boolean
}

export interface LiveExerciseItem {
  id: string
  name: string
  category: string
  restSeconds: number
  sets: LiveSetItem[]
}

interface FitnessLiveSessionProps {
  initialRoutine?: {
    name: string
    exercises: Array<{
      name: string
      category?: string
      sets?: number
      reps?: string | number
      restSeconds?: number
    }>
  } | null
  onWorkoutSaved: () => void
  onSwitchTab?: (tab: string) => void
}

export function FitnessLiveSession({
  initialRoutine,
  onWorkoutSaved,
  onSwitchTab,
}: FitnessLiveSessionProps) {
  // Session Active Timer
  const [isActive, setIsActive] = useState(true)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Rest Timer State
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null)
  const [activeRestTotal, setActiveRestTotal] = useState<number>(90)
  const restTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Workout Name & Exercises
  const [workoutTitle, setWorkoutTitle] = useState(
    initialRoutine?.name || "Upper Body Hypertrophy Session"
  )
  const [exercises, setExercises] = useState<LiveExerciseItem[]>(() => {
    if (initialRoutine?.exercises && initialRoutine.exercises.length > 0) {
      return initialRoutine.exercises.map((ex, i) => {
        const count = typeof ex.sets === "number" ? ex.sets : 3
        const repsNum = typeof ex.reps === "number" ? ex.reps : parseInt(String(ex.reps)) || 10
        return {
          id: `ex-${i}-${Date.now()}`,
          name: ex.name,
          category: ex.category || "General",
          restSeconds: ex.restSeconds || 90,
          sets: Array.from({ length: count }, (_, sIndex) => ({
            setNumber: sIndex + 1,
            weight: 20 + sIndex * 5,
            reps: repsNum,
            completed: false,
          })),
        }
      })
    }

    // Default template if no routine provided
    return [
      {
        id: "ex-1",
        name: "Barbell Bench Press",
        category: "Chest",
        restSeconds: 90,
        sets: [
          { setNumber: 1, weight: 60, reps: 10, completed: false },
          { setNumber: 2, weight: 65, reps: 8, completed: false },
          { setNumber: 3, weight: 70, reps: 6, completed: false },
        ],
      },
      {
        id: "ex-2",
        name: "Incline Dumbbell Press",
        category: "Chest",
        restSeconds: 75,
        sets: [
          { setNumber: 1, weight: 24, reps: 10, completed: false },
          { setNumber: 2, weight: 26, reps: 8, completed: false },
          { setNumber: 3, weight: 26, reps: 8, completed: false },
        ],
      },
      {
        id: "ex-3",
        name: "Standing Cable Flyes",
        category: "Chest",
        restSeconds: 60,
        sets: [
          { setNumber: 1, weight: 15, reps: 12, completed: false },
          { setNumber: 2, weight: 15, reps: 12, completed: false },
          { setNumber: 3, weight: 17.5, reps: 10, completed: false },
        ],
      },
    ]
  })

  // Selected Active Exercise Index
  const [activeExerciseIndex, setActiveExerciseIndex] = useState(0)
  const [newExerciseName, setNewExerciseName] = useState("")
  const [isFinishing, setIsFinishing] = useState(false)

  // ─── Stopwatch Interval ───────────────────────────────────────────────────
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1)
      }, 1000)
    } else if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isActive])

  // ─── Rest Interval Timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (restSecondsRemaining !== null && restSecondsRemaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsRemaining((prev) => (prev !== null ? prev - 1 : null))
      }, 1000)
    } else if (restSecondsRemaining === 0) {
      if (restTimerRef.current) clearInterval(restTimerRef.current)
      setRestSecondsRemaining(null)
      toast.success("Rest complete! Ready for your next set.", {
        icon: "⚡",
      })
    }

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current)
    }
  }, [restSecondsRemaining])

  // Format MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // ─── Complete Set & Trigger Rest Timer ─────────────────────────────────────
  const toggleSetComplete = (exIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev]
      const currentSet = copy[exIndex].sets[setIndex]
      const isNowCompleted = !currentSet.completed
      currentSet.completed = isNowCompleted

      // If set just marked completed, trigger rest timer!
      if (isNowCompleted) {
        const restDuration = copy[exIndex].restSeconds || 90
        setActiveRestTotal(restDuration)
        setRestSecondsRemaining(restDuration)
        toast.info(`Set ${currentSet.setNumber} completed! ${restDuration}s rest started.`)
      }

      return copy
    })
  }

  // Update Set Weight / Reps
  const updateSetValues = (
    exIndex: number,
    setIndex: number,
    field: "weight" | "reps",
    value: number
  ) => {
    setExercises((prev) => {
      const copy = [...prev]
      copy[exIndex].sets[setIndex][field] = value
      return copy
    })
  }

  // Add Set to Exercise
  const handleAddSet = (exIndex: number) => {
    setExercises((prev) => {
      const copy = [...prev]
      const currentSets = copy[exIndex].sets
      const lastSet = currentSets[currentSets.length - 1]
      currentSets.push({
        setNumber: currentSets.length + 1,
        weight: lastSet ? lastSet.weight : 20,
        reps: lastSet ? lastSet.reps : 10,
        completed: false,
      })
      return copy
    })
  }

  // Add New Exercise to Session
  const handleAddExercise = () => {
    if (!newExerciseName.trim()) return
    const newEx: LiveExerciseItem = {
      id: `ex-custom-${Date.now()}`,
      name: newExerciseName.trim(),
      category: "Custom",
      restSeconds: 90,
      sets: [
        { setNumber: 1, weight: 20, reps: 10, completed: false },
        { setNumber: 2, weight: 20, reps: 10, completed: false },
        { setNumber: 3, weight: 20, reps: 10, completed: false },
      ],
    }
    setExercises((prev) => [...prev, newEx])
    setNewExerciseName("")
    setActiveExerciseIndex(exercises.length)
    toast.success(`Added "${newEx.name}" to session`)
  }

  // ─── Live Metrics Calculations ────────────────────────────────────────────
  const completedSets = exercises.reduce(
    (total, ex) => total + ex.sets.filter((s) => s.completed).length,
    0
  )
  const totalSets = exercises.reduce((total, ex) => total + ex.sets.length, 0)
  const totalVolume = exercises.reduce(
    (total, ex) =>
      total +
      ex.sets
        .filter((s) => s.completed)
        .reduce((sTotal, s) => sTotal + s.weight * s.reps, 0),
    0
  )
  const estimatedCalories = Math.round(
    (elapsedSeconds / 60) * 7.5 + completedSets * 4
  )

  // ─── Finish Workout & Save to DB ──────────────────────────────────────────
  const handleFinishWorkout = async () => {
    setIsFinishing(true)
    try {
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60))
      const formattedExercises = exercises
        .filter((ex) => ex.sets.some((s) => s.completed))
        .map((ex) => {
          const completedSetsList = ex.sets.filter((s) => s.completed)
          const avgWeight = Math.round(
            completedSetsList.reduce((sum, s) => sum + s.weight, 0) / completedSetsList.length
          )
          const totalReps = completedSetsList.reduce((sum, s) => sum + s.reps, 0)
          return {
            name: ex.name,
            sets: completedSetsList.length,
            reps: Math.round(totalReps / completedSetsList.length),
            weight: avgWeight,
          }
        })

      const payload = {
        date: new Date().toISOString().split("T")[0],
        type: "workout",
        workoutType: "strength",
        duration: durationMinutes,
        caloriesBurned: estimatedCalories,
        intensity: "high",
        exercises: formattedExercises.length > 0 ? formattedExercises : [
          { name: workoutTitle, sets: completedSets || 3, reps: 10, weight: 50 },
        ],
        notes: `Completed live session: ${workoutTitle}. Total Volume Lifted: ${totalVolume.toLocaleString()} kg across ${completedSets} completed sets.`,
      }

      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error("Failed to save workout")

      toast.success(
        `Workout finished! ${totalVolume.toLocaleString()} kg lifted. Great job!`,
        { icon: "🏆", duration: 5000 }
      )
      setIsActive(false)
      onWorkoutSaved()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save workout session")
    } finally {
      setIsFinishing(false)
    }
  }

  const activeExercise = exercises[activeExerciseIndex] || exercises[0]

  return (
    <div className="space-y-6">
      {/* Active Session Ticker Bar */}
      <Card className="bg-gradient-to-r from-card via-card to-primary/5 border-primary/20 shadow-md">
        <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Live Workout Mode
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">{workoutTitle}</h2>
            <p className="text-xs text-muted-foreground">
              {completedSets} of {totalSets} sets completed · {exercises.length} exercises
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Stopwatch Timer */}
            <div className="flex items-center gap-2 bg-secondary/80 px-3.5 py-2 rounded-xl border">
              <Timer className="w-4 h-4 text-primary" />
              <div className="font-mono text-xl sm:text-2xl font-bold tracking-tight">
                {formatTime(elapsedSeconds)}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 text-muted-foreground hover:text-foreground"
                onClick={() => setIsActive(!isActive)}
              >
                {isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Volume Ticker */}
            <div className="bg-secondary/50 px-3.5 py-2 rounded-xl border flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Volume
                </span>
                <span className="text-sm font-bold">{totalVolume.toLocaleString()} kg</span>
              </div>
            </div>

            {/* Calories Ticker */}
            <div className="bg-secondary/50 px-3.5 py-2 rounded-xl border flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <div>
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">
                  Burn
                </span>
                <span className="text-sm font-bold">{estimatedCalories} cal</span>
              </div>
            </div>

            {/* Finish Workout Button */}
            <Button
              onClick={handleFinishWorkout}
              disabled={isFinishing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider h-11 px-5 gap-2 shadow-sm"
            >
              <Trophy className="w-4 h-4" />
              {isFinishing ? "Saving..." : "Finish Workout"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pulsating Circular Rest Timer Ring */}
      {restSecondsRemaining !== null && (
        <RestTimerRing
          secondsRemaining={restSecondsRemaining}
          totalSeconds={activeRestTotal}
          onAddSeconds={(s) => setRestSecondsRemaining((prev) => (prev ? prev + s : s))}
          onSkip={() => setRestSecondsRemaining(null)}
        />
      )}

      {/* Main Exercise Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Exercise Navigation List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Exercise Queue ({exercises.length})
            </h3>
          </div>

          <div className="space-y-2">
            {exercises.map((ex, idx) => {
              const isSelected = idx === activeExerciseIndex
              const doneCount = ex.sets.filter((s) => s.completed).length
              const allDone = doneCount === ex.sets.length && ex.sets.length > 0

              return (
                <div
                  key={ex.id}
                  onClick={() => setActiveExerciseIndex(idx)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3",
                    isSelected
                      ? "bg-card border-primary ring-1 ring-primary/40 shadow-sm"
                      : "bg-secondary/30 hover:bg-secondary/60 border-border/70 text-muted-foreground"
                  )}
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-muted-foreground">
                        #{idx + 1}
                      </span>
                      <h4 className={cn("text-xs font-bold truncate", isSelected ? "text-foreground" : "")}>
                        {ex.name}
                      </h4>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      {doneCount}/{ex.sets.length} sets completed
                    </span>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {allDone ? (
                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none text-[9px] font-bold p-1 rounded-full">
                        <Check className="w-3 h-3" />
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-mono">
                        {ex.sets.length} sets
                      </Badge>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Add Exercise on the Fly */}
          <div className="pt-2 flex gap-2">
            <Input
              placeholder="Add another exercise..."
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddExercise()}
              className="text-xs h-9"
            />
            <Button size="sm" onClick={handleAddExercise} className="h-9 px-3">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right: Active Exercise Sets Logger */}
        <div className="lg:col-span-8">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider mb-1">
                    {activeExercise.category || "General"}
                  </Badge>
                  <CardTitle className="text-lg font-bold tracking-tight">
                    {activeExercise.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Target {activeExercise.sets.length} sets · Prescribed rest: {activeExercise.restSeconds}s
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSet(activeExerciseIndex)}
                    className="text-xs font-bold uppercase tracking-wider h-8 gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Set
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {/* Sets Table Header */}
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
                <span className="col-span-2">Set</span>
                <span className="col-span-4">Weight (kg/lbs)</span>
                <span className="col-span-3">Reps</span>
                <span className="col-span-3 text-right">Checkoff</span>
              </div>

              {/* Sets Rows */}
              <div className="space-y-2">
                {activeExercise.sets.map((set, sIdx) => (
                  <div
                    key={set.setNumber}
                    className={cn(
                      "grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-all",
                      set.completed
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    {/* Set Number */}
                    <div className="col-span-2 flex items-center gap-1.5 font-bold text-xs">
                      <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[11px] font-mono">
                        {set.setNumber}
                      </span>
                    </div>

                    {/* Weight Input */}
                    <div className="col-span-4">
                      <Input
                        type="number"
                        value={set.weight || ""}
                        onChange={(e) =>
                          updateSetValues(
                            activeExerciseIndex,
                            sIdx,
                            "weight",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="h-8 text-xs font-bold font-mono"
                        placeholder="kg"
                      />
                    </div>

                    {/* Reps Input */}
                    <div className="col-span-3">
                      <Input
                        type="number"
                        value={set.reps || ""}
                        onChange={(e) =>
                          updateSetValues(
                            activeExerciseIndex,
                            sIdx,
                            "reps",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-8 text-xs font-bold font-mono"
                        placeholder="reps"
                      />
                    </div>

                    {/* Complete Button */}
                    <div className="col-span-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => toggleSetComplete(activeExerciseIndex, sIdx)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold uppercase tracking-wider transition-all gap-1.5",
                          set.completed
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-secondary text-foreground hover:bg-secondary/80 border"
                        )}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {set.completed ? "Done" : "Log"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next Exercise Quick Navigation */}
              <div className="pt-4 border-t flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={activeExerciseIndex === 0}
                  onClick={() => setActiveExerciseIndex((prev) => Math.max(0, prev - 1))}
                  className="text-xs"
                >
                  Previous Exercise
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={activeExerciseIndex === exercises.length - 1}
                  onClick={() => setActiveExerciseIndex((prev) => Math.min(exercises.length - 1, prev + 1))}
                  className="text-xs gap-1.5"
                >
                  Next Exercise
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
