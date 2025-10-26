"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Flame, Target, TrendingUp } from "lucide-react"
import { useMemo } from "react"

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

interface FitnessStatsProps {
  fitnessData: FitnessEntry[]
}

export function FitnessStats({ fitnessData }: FitnessStatsProps) {
  const stats = useMemo(() => {
    const workouts = fitnessData.filter((entry) => entry.type === "workout")
    const totalWorkouts = workouts.length
    const totalMinutes = workouts.reduce((sum, entry) => sum + (entry.duration_minutes || 0), 0)
    const totalCalories = workouts.reduce((sum, entry) => sum + (entry.calories_burned || 0), 0)
    const goals = fitnessData.filter((entry) => entry.type === "goal").length

    return { totalWorkouts, totalMinutes, totalCalories, goals }
  }, [fitnessData])

  const cards = [
    {
      title: "Total Workouts",
      value: stats.totalWorkouts,
      icon: Activity,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
      suffix: "",
    },
    {
      title: "Total Minutes",
      value: stats.totalMinutes,
      icon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      suffix: " min",
    },
    {
      title: "Calories Burned",
      value: stats.totalCalories,
      icon: Flame,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
      suffix: " cal",
    },
    {
      title: "Active Goals",
      value: stats.goals,
      icon: Target,
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/50",
      suffix: "",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className="backdrop-blur-sm bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {card.value.toLocaleString()}
                {card.suffix}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
