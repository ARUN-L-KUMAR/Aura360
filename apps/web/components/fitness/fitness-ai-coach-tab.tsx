"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sparkles,
  Dumbbell,
  Play,
  RotateCw,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  Zap,
  Clock,
  Shield,
  CheckCircle2,
  RefreshCw,
  Sliders,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FitnessAiCoachTabProps {
  onStartRoutine: (routine: {
    name: string
    exercises: Array<{
      name: string
      category?: string
      sets?: number
      reps?: string | number
      restSeconds?: number
    }>
  }) => void
}

export function FitnessAiCoachTab({ onStartRoutine }: FitnessAiCoachTabProps) {
  // Generator Parameters
  const [goal, setGoal] = useState("Hypertrophy & Muscle Building")
  const [equipment, setEquipment] = useState("Full Commercial Gym")
  const [daysPerWeek, setDaysPerWeek] = useState(4)
  const [experienceLevel, setExperienceLevel] = useState("Intermediate")
  const [isGenerating, setIsGenerating] = useState(false)

  // Current Active Program
  const [activeProgram, setActiveProgram] = useState<any>({
    programName: "Aura 4-Day Upper/Lower Hypertrophy",
    goal: "Hypertrophy & Muscle Building",
    frequency: "4 Days / Week",
    difficulty: "Intermediate",
    weeklyOverview:
      "A scientifically balanced 4-day Upper/Lower split designed to maximize myofibrillar hypertrophy while guaranteeing complete 48-hour recovery windows between sessions.",
    progressiveOverloadTip:
      "Aim to add 1 rep per set each week. Once you reach the top of the rep range, increase weight by 2.5kg / 5lbs.",
    recoveryStrategy:
      "Prioritize 7.5+ hours of deep sleep and maintain 1.8g protein per kg of bodyweight daily.",
    days: [
      {
        dayNumber: 1,
        name: "Day 1: Upper Body Strength & Mass",
        isRestDay: false,
        focus: "Chest, Upper Back, Shoulders & Arms",
        targetDurationMinutes: 60,
        exercises: [
          { name: "Barbell Bench Press", category: "Chest", sets: 4, reps: "6-8", restSeconds: 90, rpe: 8, notes: "Retract scapulae and drive through feet" },
          { name: "Bent-Over Barbell Row", category: "Back", sets: 4, reps: "8-10", restSeconds: 90, rpe: 8, notes: "Pull to lower sternum with flat back" },
          { name: "Dumbbell Overhead Shoulder Press", category: "Shoulders", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Full lockout overhead" },
          { name: "Lat Pulldown / Pull-ups", category: "Back", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Controlled eccentric lowering" },
          { name: "Incline Dumbbell Bicep Curls", category: "Arms", sets: 3, reps: "12-15", restSeconds: 60, rpe: 9, notes: "Strict curl, no elbow drift" },
        ],
      },
      {
        dayNumber: 2,
        name: "Day 2: Lower Body Power & Core",
        isRestDay: false,
        focus: "Quads, Hamstrings, Glutes & Abs",
        targetDurationMinutes: 55,
        exercises: [
          { name: "Barbell Back Squats", category: "Quads", sets: 4, reps: "6-8", restSeconds: 120, rpe: 8, notes: "Hit parallel depth with knees tracking toes" },
          { name: "Romanian Deadlifts (RDL)", category: "Hamstrings", sets: 3, reps: "8-10", restSeconds: 90, rpe: 8, notes: "Hinge deep at hips, feel hamstring stretch" },
          { name: "Bulgarian Split Squats", category: "Quads", sets: 3, reps: "10-12", restSeconds: 60, rpe: 8, notes: "Each leg, stay tall" },
          { name: "Standing Calf Raises", category: "Calves", sets: 4, reps: "12-15", restSeconds: 45, rpe: 9, notes: "2-sec pause at peak contraction" },
          { name: "Hanging Leg Raises", category: "Core", sets: 3, reps: "12-15", restSeconds: 45, rpe: 8, notes: "Flex abs, prevent swinging" },
        ],
      },
      {
        dayNumber: 3,
        name: "Day 3: Active Recovery & Mobility",
        isRestDay: true,
        focus: "Walking, Joint Mobility & Soft Tissue",
        targetDurationMinutes: 25,
        exercises: [],
      },
      {
        dayNumber: 4,
        name: "Day 4: Upper Body Volume & Pump",
        isRestDay: false,
        focus: "Hypertrophy, Delts & Arms",
        targetDurationMinutes: 55,
        exercises: [
          { name: "Incline Dumbbell Press", category: "Chest", sets: 3, reps: "10-12", restSeconds: 75, rpe: 8, notes: "30-degree incline" },
          { name: "Seated Cable Row", category: "Back", sets: 3, reps: "10-12", restSeconds: 75, rpe: 8, notes: "Full stretch and tight pinch" },
          { name: "Dumbbell Lateral Raises", category: "Shoulders", sets: 4, reps: "12-15", restSeconds: 45, rpe: 9, notes: "Lead with elbows" },
          { name: "Tricep Rope Pushdowns", category: "Arms", sets: 3, reps: "12-15", restSeconds: 60, rpe: 9, notes: "Spread ropes apart at bottom" },
        ],
      },
    ],
  })

  // Selected Day View
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)

  // ─── Generate Custom Split ────────────────────────────────────────────────
  const handleGenerateSplit = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/fitness/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_split",
          params: {
            goal,
            equipment,
            daysPerWeek,
            experienceLevel,
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to generate split")
      const result = await res.json()

      if (result.success && result.split) {
        setActiveProgram(result.split)
        setSelectedDayIndex(0)
        toast.success(`Generated: "${result.split.programName}"`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate custom split")
    } finally {
      setIsGenerating(false)
    }
  }

  // ─── Launch Routine in Live Session ───────────────────────────────────────
  const handleLaunchSession = (day: any) => {
    if (day.isRestDay || !day.exercises || day.exercises.length === 0) {
      toast.info("This is an active recovery day. Enjoy your rest!")
      return
    }

    onStartRoutine({
      name: day.name,
      exercises: day.exercises,
    })
    toast.success(`Loaded "${day.name}" into Live Workout Tracker!`)
  }

  const currentDay = activeProgram.days[selectedDayIndex] || activeProgram.days[0]

  return (
    <div className="space-y-6">
      {/* AI Split Architect Generator Card */}
      <Card className="bg-card/80 border-border shadow-sm">
        <CardHeader className="p-5 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                AI Workout Split Architect
              </CardTitle>
              <CardDescription className="text-xs">
                Design a custom, science-backed multi-week training program tailored to your exact equipment and goals.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Goal */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Primary Goal
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                {[
                  "Hypertrophy & Muscle Building",
                  "Fat Loss & Metabolic Conditioning",
                  "Raw Strength & Powerbuilding",
                  "Endurance & 5K Running Prep",
                  "Functional Longevity & Mobility",
                ].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Available Equipment
              </label>
              <select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                {[
                  "Full Commercial Gym",
                  "Home Dumbbells & Bench",
                  "Bodyweight & Calisthenics",
                  "Barbell & Squat Rack",
                  "Kettlebells & Resistance Bands",
                ].map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
            </div>

            {/* Days Per Week */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Weekly Frequency
              </label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                {[
                  { days: 3, label: "3 Days / Week (Full Body)" },
                  { days: 4, label: "4 Days / Week (Upper / Lower)" },
                  { days: 5, label: "5 Days / Week (Upper / Lower / PPL)" },
                  { days: 6, label: "6 Days / Week (Push / Pull / Legs)" },
                ].map((d) => (
                  <option key={d.days} value={d.days}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Experience Level */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Experience Level
              </label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                {[
                  "Beginner (Foundations)",
                  "Intermediate (Overload)",
                  "Advanced (Periodized)",
                ].map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              onClick={handleGenerateSplit}
              disabled={isGenerating}
              className="gap-2 text-xs font-bold uppercase tracking-wider px-5 h-9"
            >
              <Sparkles className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
              {isGenerating ? "Architecting Program..." : "Generate AI Split"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Program Header Overview Card */}
      <Card className="bg-gradient-to-r from-card via-card to-secondary/30 border-border shadow-sm">
        <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                {activeProgram.frequency}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-bold">
                {activeProgram.difficulty}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {activeProgram.goal}
              </Badge>
            </div>
            <h3 className="text-xl font-black tracking-tight">{activeProgram.programName}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeProgram.weeklyOverview}
            </p>
          </div>

          {activeProgram.progressiveOverloadTip && (
            <div className="p-3 rounded-xl bg-secondary/50 border max-w-xs text-xs space-y-1 shrink-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary block">
                Progressive Overload Rule
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {activeProgram.progressiveOverloadTip}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Days Tabs & Routine Breakdown */}
      <div className="space-y-4">
        {/* Day Pills Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {activeProgram.days.map((day: any, idx: number) => {
            const isSelected = idx === selectedDayIndex
            return (
              <button
                key={day.dayNumber || idx}
                onClick={() => setSelectedDayIndex(idx)}
                className={cn(
                  "shrink-0 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all text-left flex flex-col gap-0.5",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-secondary/60 border-border text-muted-foreground"
                )}
              >
                <span className="text-[9px] uppercase tracking-wider opacity-80">
                  Day {day.dayNumber || idx + 1}
                </span>
                <span className="font-extrabold truncate max-w-[130px]">
                  {day.isRestDay ? "Recovery" : day.name.replace(/^Day \d+:\s*/, "")}
                </span>
              </button>
            )
          })}
        </div>

        {/* Selected Day Routine Card */}
        {currentDay && (
          <Card className="border-border shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentDay.isRestDay ? "outline" : "default"} className="text-[9px] font-bold uppercase tracking-wider">
                      {currentDay.isRestDay ? "Active Recovery" : "Workout Session"}
                    </Badge>
                    {!currentDay.isRestDay && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        ~{currentDay.targetDurationMinutes} mins
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold tracking-tight">
                    {currentDay.name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Focus: {currentDay.focus}
                  </CardDescription>
                </div>

                {!currentDay.isRestDay && (
                  <Button
                    onClick={() => handleLaunchSession(currentDay)}
                    className="gap-2 text-xs font-bold uppercase tracking-wider h-10 px-5 shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Start This Workout
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-5">
              {currentDay.isRestDay ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mx-auto text-primary">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm">Scheduled Recovery & Muscle Repair</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Muscle growth and neural adaptation happen during rest. Hydrate, eat balanced protein meals, and aim for a 20-minute light walk or mobility session.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3">
                    <span className="col-span-5 sm:col-span-4">Exercise</span>
                    <span className="col-span-3 sm:col-span-2">Sets × Reps</span>
                    <span className="col-span-2 hidden sm:block">Rest</span>
                    <span className="col-span-4 sm:col-span-4">Key Technique Note</span>
                  </div>

                  <div className="space-y-2">
                    {currentDay.exercises?.map((ex: any, i: number) => (
                      <div
                        key={ex.name || i}
                        className="grid grid-cols-12 gap-3 items-center p-3 rounded-xl border bg-card/60 hover:bg-secondary/40 transition-colors text-xs"
                      >
                        <div className="col-span-5 sm:col-span-4 space-y-0.5">
                          <h5 className="font-bold text-foreground truncate">{ex.name}</h5>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                            {ex.category}
                          </Badge>
                        </div>

                        <div className="col-span-3 sm:col-span-2 font-mono font-bold">
                          {ex.sets} × {ex.reps}
                        </div>

                        <div className="col-span-2 hidden sm:block text-muted-foreground font-mono text-[11px]">
                          {ex.restSeconds}s
                        </div>

                        <div className="col-span-4 sm:col-span-4 text-muted-foreground text-[11px] truncate">
                          {ex.notes || "Controlled reps through full range"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
