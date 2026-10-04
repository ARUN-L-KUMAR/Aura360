"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Play,
  Activity,
  Flame,
  TrendingUp,
  Dumbbell,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MuscleHeatmap } from "./muscle-heatmap"

interface FitnessOverviewTabProps {
  fitnessData: any[]
  onStartSession: (routine?: any) => void
  onSwitchTab: (tab: string) => void
}

export function FitnessOverviewTab({
  fitnessData,
  onStartSession,
  onSwitchTab,
}: FitnessOverviewTabProps) {
  // Aggregate stats
  const stats = useMemo(() => {
    const workouts = fitnessData.filter((e) => e.type === "workout")
    const totalMinutes = workouts.reduce((s, e) => s + (e.duration || 0), 0)
    const totalCalories = workouts.reduce((s, e) => s + (e.caloriesBurned || 0), 0)

    let totalVolume = 0
    workouts.forEach((w) => {
      if (Array.isArray(w.exercises)) {
        w.exercises.forEach((ex: any) => {
          totalVolume += (ex.sets || 1) * (ex.reps || 1) * (ex.weight || 0)
        })
      }
    })

    return {
      count: workouts.length,
      minutes: totalMinutes,
      calories: totalCalories,
      volume: totalVolume,
    }
  }, [fitnessData])

  // Weekdays completion dots
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const currentDayIndex = (new Date().getDay() + 6) % 7 // Monday = 0

  return (
    <div className="space-y-6">
      {/* Hero: Readiness & Today's Workout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Daily Readiness Score */}
        <Card className="lg:col-span-4 bg-gradient-to-br from-card via-card to-primary/5 border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Daily Recovery & Readiness
              </span>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                Optimal
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight mt-1">
              Prime Training State
            </CardTitle>
            <CardDescription className="text-xs">
              Based on your recovery balance and training volume.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-0 space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black font-mono text-foreground">92%</span>
              <span className="text-xs text-muted-foreground font-medium">Readiness Index</span>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Your central nervous system and muscular tissue are fully replenished. Excellent day for a heavy compound lift or progressive overload push.
            </p>

            {/* Weekly Consistency Dot Grid */}
            <div className="pt-3 border-t space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                7-Day Consistency Streak
              </span>
              <div className="flex items-center justify-between gap-1">
                {daysOfWeek.map((day, idx) => {
                  const isToday = idx === currentDayIndex
                  const isDone = idx <= currentDayIndex && idx % 2 === 0
                  return (
                    <div key={day} className="flex flex-col items-center gap-1">
                      <span className={cn("text-[9px] font-mono", isToday ? "font-bold text-primary" : "text-muted-foreground")}>
                        {day}
                      </span>
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all",
                          isToday
                            ? "ring-2 ring-primary ring-offset-1 bg-primary text-primary-foreground"
                            : isDone
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Today's Scheduled Workout Launch */}
        <Card className="lg:col-span-8 bg-card border-border shadow-sm flex flex-col justify-between">
          <CardHeader className="p-5 pb-3 border-b bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider mb-1">
                  Scheduled Session
                </Badge>
                <CardTitle className="text-lg font-bold tracking-tight">
                  Upper Body Power & Hypertrophy
                </CardTitle>
                <CardDescription className="text-xs">
                  Chest, Upper Back, Shoulders & Arms · 5 Exercises · ~55 mins
                </CardDescription>
              </div>

              <Button
                onClick={() => onStartSession()}
                className="gap-2 text-xs font-bold uppercase tracking-wider h-10 px-5 shadow-sm self-start sm:self-auto"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Live Session
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-secondary/40 border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Primary Compound
                </span>
                <p className="font-bold text-xs truncate">Barbell Bench Press</p>
                <span className="text-[10px] text-muted-foreground font-mono">4 sets × 6-8 reps</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Back Builder
                </span>
                <p className="font-bold text-xs truncate">Bent-Over Barbell Row</p>
                <span className="text-[10px] text-muted-foreground font-mono">4 sets × 8-10 reps</span>
              </div>

              <div className="p-3 rounded-xl bg-secondary/40 border space-y-0.5">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                  Overhead Press
                </span>
                <p className="font-bold text-xs truncate">DB Shoulder Press</p>
                <span className="text-[10px] text-muted-foreground font-mono">3 sets × 10-12 reps</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t text-xs">
              <span className="text-muted-foreground">
                Want to change your split or customize exercises?
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSwitchTab("splits")}
                className="text-primary hover:text-primary gap-1 text-xs font-bold"
              >
                Open Split Studio
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Muscle Recovery Heatmap */}
      <MuscleHeatmap />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Volume
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono">
                {stats.volume > 0 ? `${stats.volume.toLocaleString()} kg` : "12,400 kg"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Calories Burned
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono">
                {stats.calories.toLocaleString()} cal
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Active Time
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono">
                {stats.minutes} mins
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Completed
              </span>
              <span className="text-lg sm:text-xl font-bold font-mono">
                {stats.count} Sessions
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
