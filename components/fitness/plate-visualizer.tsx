"use client"

import React, { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dumbbell } from "lucide-react"

interface PlateVisualizerProps {
  totalWeight: number // in kg
  barbellWeight?: number // default 20kg
}

interface Plate {
  weight: number
  color: string
  labelColor: string
  height: string // CSS height
  width: string
}

export function PlateVisualizer({
  totalWeight,
  barbellWeight = 20,
}: PlateVisualizerProps) {
  // Calculate plates per side
  const platesPerSide = useMemo(() => {
    let weightPerSide = Math.max(0, (totalWeight - barbellWeight) / 2)
    const availablePlates: Array<{ weight: number; color: string; labelColor: string; height: string; width: string }> = [
      { weight: 25, color: "bg-red-600 border-red-700", labelColor: "text-white", height: "h-28", width: "w-5" },
      { weight: 20, color: "bg-blue-600 border-blue-700", labelColor: "text-white", height: "h-26", width: "w-5" },
      { weight: 15, color: "bg-amber-400 border-amber-500", labelColor: "text-black", height: "h-24", width: "w-4.5" },
      { weight: 10, color: "bg-emerald-600 border-emerald-700", labelColor: "text-white", height: "h-20", width: "w-4" },
      { weight: 5, color: "bg-slate-100 border-slate-300 dark:bg-slate-200", labelColor: "text-black", height: "h-16", width: "w-3.5" },
      { weight: 2.5, color: "bg-zinc-800 border-zinc-950", labelColor: "text-white", height: "h-13", width: "w-3" },
      { weight: 1.25, color: "bg-slate-400 border-slate-500", labelColor: "text-black", height: "h-10", width: "w-2.5" },
    ]

    const loaded: typeof availablePlates = []
    for (const plate of availablePlates) {
      while (weightPerSide >= plate.weight) {
        loaded.push(plate)
        weightPerSide -= plate.weight
      }
    }
    return loaded
  }, [totalWeight, barbellWeight])

  return (
    <div className="p-4 rounded-2xl border bg-card/80 shadow-sm backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Olympic Barbell Plate Loader ({totalWeight} kg)
          </span>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono font-bold">
          20kg Bar + {((totalWeight - barbellWeight) / 2).toFixed(1)}kg/side
        </Badge>
      </div>

      {/* Visual Barbell Shaft & Plates Graphics */}
      <div className="h-32 flex items-center justify-center bg-secondary/30 rounded-xl px-4 overflow-x-auto no-scrollbar relative border border-border/60">
        {/* Steel Bar Center Shaft */}
        <div className="absolute h-3 bg-gradient-to-b from-slate-300 to-slate-500 w-4/5 rounded-full shadow-md z-0" />

        {/* Collar Stop Left */}
        <div className="z-10 h-10 w-2.5 bg-zinc-600 rounded-sm shadow-md" />

        {/* Plates Loaded on Left Side (mirrored) */}
        <div className="z-10 flex items-center gap-1 mx-2">
          {platesPerSide.map((p, i) => (
            <div
              key={`left-${i}`}
              className={`${p.color} ${p.height} ${p.width} border rounded-sm flex items-center justify-center shadow-lg transition-all duration-300 select-none hover:scale-105`}
              title={`${p.weight} kg`}
            >
              <span className={`text-[8px] font-black font-mono rotate-90 ${p.labelColor}`}>
                {p.weight}
              </span>
            </div>
          ))}
        </div>

        {/* Outer Spring Collar Left */}
        {platesPerSide.length > 0 && (
          <div className="z-10 h-7 w-2 bg-zinc-400 rounded-full border border-zinc-600 shadow-sm" />
        )}
      </div>

      {/* Plates Summary Breakdown */}
      <div className="flex items-center gap-2 flex-wrap text-[11px] pt-1 border-t text-muted-foreground">
        <span className="font-bold text-foreground">Each side loads:</span>
        {platesPerSide.length > 0 ? (
          platesPerSide.map((p, i) => (
            <span key={i} className="font-mono bg-secondary px-1.5 py-0.5 rounded border">
              {p.weight}kg
            </span>
          ))
        ) : (
          <span>Empty Bar (20kg)</span>
        )}
      </div>
    </div>
  )
}
