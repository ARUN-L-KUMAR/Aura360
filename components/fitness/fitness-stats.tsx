"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Flame, Target, TrendingUp } from "lucide-react"
import { useMemo } from "react"
import type { FitnessEntry } from "@/lib/types/fitness"

interface FitnessStatsProps {
  fitnessData: FitnessEntry[]
}

export function FitnessStats({ fitnessData }: FitnessStatsProps) {
  const stats = useMemo(() => {
    const workouts = fitnessData.filter((entry) => entry.type === "workout")
    const totalWorkouts = workouts.length
    const totalMinutes = workouts.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const totalCalories = workouts.reduce((sum, entry) => sum + (entry.caloriesBurned || 0), 0)
    const goals = fitnessData.filter((entry) => entry.type === "goal").length

    return { totalWorkouts, totalMinutes, totalCalories, goals }
  }, [fitnessData])

  const cards = [
    {
      title: "Total Workouts",
      value: stats.totalWorkouts,
      icon: Activity,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      suffix: "",
    },
    {
      title: "Total Minutes",
      value: stats.totalMinutes,
      icon: TrendingUp,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      suffix: " min",
    },
    {
      title: "Calories Burned",
      value: stats.totalCalories,
      icon: Flame,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
      suffix: " cal",
    },
    {
      title: "Active Goals",
      value: stats.goals,
      icon: Target,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-secondary/50",
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
