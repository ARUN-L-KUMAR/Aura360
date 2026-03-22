"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sun, Moon, Clock, Calendar, Star } from "lucide-react"
import { useMemo } from "react"
import { SkincareProduct } from "@/lib/types/skincare"

interface SkincareRoutineProps {
  products: SkincareProduct[]
}

export function SkincareRoutine({ products }: SkincareRoutineProps) {
  const routines = useMemo(() => {
    const morning = products.filter((p) => p.routineTime === "morning" || p.routineTime === "both")
    const evening = products.filter((p) => p.routineTime === "evening" || p.routineTime === "both")
    const weekly = products.filter((p) => p.routineTime === "weekly")
    const optional = products.filter((p) => p.routineTime === "optional")
    const asNeeded = products.filter((p) => !p.routineTime)

    return { morning, evening, weekly, optional, asNeeded }
  }, [products])

  const routineCards = [
    {
      title: "Morning Routine",
      count: routines.morning.length,
      icon: Sun,
      color: "text-yellow-600 dark:text-yellow-400",
      bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
    },
    {
      title: "Evening Routine",
      count: routines.evening.length,
      icon: Moon,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      title: "Weekly",
      count: routines.weekly.length,
      icon: Calendar,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/50",
    },
    {
      title: "As Needed",
      count: routines.asNeeded.length,
      icon: Clock,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {routineCards.map((card) => {
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
              <div className="text-2xl font-bold">{card.count} products</div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
