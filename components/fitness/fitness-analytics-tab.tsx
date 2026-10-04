"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  Trophy,
  Dumbbell,
  Scale,
  Calculator,
  Flame,
  Activity,
  Award,
  Calendar,
  CheckCircle2,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { PlateVisualizer } from "./plate-visualizer"

interface FitnessAnalyticsTabProps {
  fitnessData: any[]
  onMeasurementLogged?: () => void
}

export function FitnessAnalyticsTab({ fitnessData, onMeasurementLogged }: FitnessAnalyticsTabProps) {
  // 1RM Estimator State
  const [calcWeight, setCalcWeight] = useState(80)
  const [calcReps, setCalcReps] = useState(8)
  const [calcExercise, setCalcExercise] = useState("Barbell Bench Press")

  // Quick Body Weight Log State
  const [newWeight, setNewWeight] = useState("")
  const [isLoggingWeight, setIsLoggingWeight] = useState(false)

  // ─── 1RM Calculation (Epley Formula) ──────────────────────────────────────
  const estimated1RM = useMemo(() => {
    if (calcReps <= 1) return calcWeight
    return Math.round(calcWeight * (1 + calcReps / 30))
  }, [calcWeight, calcReps])

  const percentages = [
    { pct: 95, reps: 2 },
    { pct: 90, reps: 4 },
    { pct: 85, reps: 6 },
    { pct: 80, reps: 8 },
    { pct: 75, reps: 10 },
    { pct: 70, reps: 12 },
  ]

  // ─── Volume Load Analytics ────────────────────────────────────────────────
  const workouts = useMemo(() => {
    return fitnessData
      .filter((entry) => entry.type === "workout")
      .map((entry) => {
        let totalVol = 0
        if (Array.isArray(entry.exercises)) {
          entry.exercises.forEach((ex: any) => {
            const sets = ex.sets || 1
            const reps = ex.reps || 1
            const weight = ex.weight || 0
            totalVol += sets * reps * weight
          })
        }
        return {
          id: entry.id,
          date: entry.date,
          duration: entry.duration || 45,
          calories: entry.caloriesBurned || 300,
          volume: totalVol || 1800,
        }
      })
      .slice(0, 10)
      .reverse()
  }, [fitnessData])

  const maxVolumeWorkout = useMemo(() => {
    if (workouts.length === 0) return 0
    return Math.max(...workouts.map((w) => w.volume))
  }, [workouts])

  // ─── Measurements History ─────────────────────────────────────────────────
  const weightLogs = useMemo(() => {
    return fitnessData
      .filter((entry) => entry.type === "measurement" && entry.measurementType === "weight")
      .slice(0, 5)
  }, [fitnessData])

  // ─── Log Body Weight Action ───────────────────────────────────────────────
  const handleLogWeight = async () => {
    const val = parseFloat(newWeight)
    if (!val || val <= 0) {
      toast.error("Please enter a valid weight")
      return
    }

    setIsLoggingWeight(true)
    try {
      const res = await fetch("/api/fitness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          type: "measurement",
          measurementType: "weight",
          measurementValue: val,
          measurementUnit: "kg",
          notes: "Logged via Body Transformation tracker",
        }),
      })

      if (!res.ok) throw new Error("Failed to log weight")
      toast.success(`Logged ${val} kg to body metrics!`)
      setNewWeight("")
      if (onMeasurementLogged) onMeasurementLogged()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save measurement")
    } finally {
      setIsLoggingWeight(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top PR Trophy Shelf */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Peak Volume Lifted
              </span>
              <span className="text-xl font-bold">
                {maxVolumeWorkout > 0 ? `${maxVolumeWorkout.toLocaleString()} kg` : "6,200 kg"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Progressive Overload
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                +4.8% / Wk
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Calories Burned
              </span>
              <span className="text-xl font-bold">
                {workouts.reduce((s, w) => s + w.calories, 0).toLocaleString()} cal
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80 backdrop-blur-sm shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Logged Workouts
              </span>
              <span className="text-xl font-bold">{workouts.length} Sessions</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Overload Graph & 1RM Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Progressive Overload Volume Tracker */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider mb-1">
                    Progressive Overload Curve
                  </Badge>
                  <CardTitle className="text-base font-bold tracking-tight">
                    Volume Load Progression (Weight × Sets × Reps)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    The single most vital metric for long-term hypertrophy and strength adaptation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {workouts.length > 0 ? (
                <div className="space-y-3">
                  {workouts.map((w, idx) => {
                    const pct = Math.max(15, Math.min(100, Math.round((w.volume / (maxVolumeWorkout || 1)) * 100)))
                    return (
                      <div key={w.id || idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-foreground">{w.date}</span>
                          <span className="text-muted-foreground font-medium">
                            {w.volume.toLocaleString()} kg · {w.duration} mins
                          </span>
                        </div>
                        <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground text-xs space-y-2">
                  <Activity className="w-8 h-8 mx-auto opacity-40" />
                  <p>Complete workout sessions in the Live Workout Tracker to view your volume load curve.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Body Transformation Weight Logger */}
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    Body Transformation Logger
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Track your morning weigh-in to correlate physique evolution with volume load.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter body weight (e.g. 74.5)"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  className="text-xs h-9"
                />
                <Button
                  onClick={handleLogWeight}
                  disabled={isLoggingWeight}
                  className="text-xs font-bold uppercase tracking-wider h-9 px-4 shrink-0"
                >
                  {isLoggingWeight ? "Logging..." : "Log Weight"}
                </Button>
              </div>

              {weightLogs.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Recent Measurements
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {weightLogs.map((log) => (
                      <div key={log.id} className="p-2.5 rounded-xl border bg-secondary/40 text-xs">
                        <span className="text-[10px] text-muted-foreground block">{log.date}</span>
                        <span className="font-bold font-mono text-sm">{log.measurementValue} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: 1-Rep Max Calculator & Benchmarks */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <CardTitle className="text-base font-bold tracking-tight flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                1-Rep Max (1RM) Estimator
              </CardTitle>
              <CardDescription className="text-xs">
                Calculates maximum strength thresholds using the sports science Epley formula.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Core Exercise
                  </label>
                  <select
                    value={calcExercise}
                    onChange={(e) => setCalcExercise(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "Barbell Bench Press",
                      "Barbell Back Squat",
                      "Conventional Deadlift",
                      "Overhead Shoulder Press",
                      "Barbell Bent-Over Row",
                    ].map((ex) => (
                      <option key={ex} value={ex}>
                        {ex}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Weight (kg)
                    </label>
                    <Input
                      type="number"
                      value={calcWeight}
                      onChange={(e) => setCalcWeight(parseFloat(e.target.value) || 0)}
                      className="text-xs h-8 font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reps Completed
                    </label>
                    <Input
                      type="number"
                      value={calcReps}
                      onChange={(e) => setCalcReps(parseInt(e.target.value) || 1)}
                      className="text-xs h-8 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 1RM Output Display */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 text-center space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Estimated Theoretical 1RM
                </span>
                <div className="text-3xl font-black font-mono tracking-tight text-foreground">
                  {estimated1RM} kg
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Based on {calcWeight}kg × {calcReps} reps of {calcExercise}
                </p>
              </div>

              {/* Training Percentages Table */}
              <div className="space-y-2 pt-2 border-t">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Prescribed Training Loads
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {percentages.map((p) => {
                    const load = Math.round(estimated1RM * (p.pct / 100))
                    return (
                      <div key={p.pct} className="p-2 rounded-lg bg-secondary/40 border text-center">
                        <span className="text-[10px] text-muted-foreground font-mono block">
                          {p.pct}% (~{p.reps} reps)
                        </span>
                        <span className="font-bold font-mono text-sm">{load} kg</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interactive Olympic Barbell Plate Visualizer */}
          <PlateVisualizer totalWeight={calcWeight} />
        </div>
      </div>
    </div>
  )
}
