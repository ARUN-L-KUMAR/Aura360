"use client"

import React from "react"
import { Droplets, Plus, Minus, RotateCcw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface WaterBottleProps {
  currentMl: number
  targetMl: number
  onAddWater: (ml: number) => void
  onResetWater?: () => void
}

export function WaterBottle({
  currentMl,
  targetMl,
  onAddWater,
  onResetWater,
}: WaterBottleProps) {
  const percentage = Math.min(100, Math.round((currentMl / (targetMl || 1)) * 100))

  return (
    <div className="flex flex-col justify-between p-5 rounded-2xl border border-sky-500/20 bg-gradient-to-br from-card via-card to-sky-500/5 shadow-md backdrop-blur-md relative overflow-hidden">
      {/* Background ambient light */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-500">
            <Droplets className="w-4 h-4 animate-bounce" />
          </div>
          <div>
            <h4 className="font-bold text-sm tracking-tight">Hydration Tank</h4>
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              Fluid Intake
            </span>
          </div>
        </div>

        <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20 text-[10px] font-bold">
          {percentage}% Target
        </Badge>
      </div>

      {/* Center: Visual Water Flask */}
      <div className="py-6 flex items-center justify-center gap-6">
        {/* Flask Graphic */}
        <div className="relative w-20 h-44 rounded-3xl border-2 border-sky-400/40 p-1 bg-sky-950/10 backdrop-blur-md shadow-inner flex flex-col justify-end overflow-hidden">
          {/* Cap */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-t-sm bg-sky-400/30 border border-sky-400/50" />

          {/* Liquid Fill Level with Wave */}
          <div
            className="w-full bg-gradient-to-t from-sky-600 to-sky-400 rounded-b-[20px] transition-all duration-700 ease-out relative"
            style={{ height: `${Math.max(8, percentage)}%` }}
          >
            {/* Wave crest */}
            <div className="absolute -top-2 left-0 right-0 h-3 bg-sky-300/40 rounded-full blur-[1px] animate-pulse" />
          </div>

          {/* Measurement Markings on the side */}
          <div className="absolute inset-y-4 right-1 flex flex-col justify-between text-[7px] font-mono text-sky-300/60 pointer-events-none">
            <span>2.5L</span>
            <span>2.0L</span>
            <span>1.5L</span>
            <span>1.0L</span>
            <span>0.5L</span>
          </div>
        </div>

        {/* Current Volume Counter */}
        <div className="space-y-1">
          <div className="text-3xl font-black font-mono tracking-tight text-foreground">
            {currentMl} <span className="text-sm font-normal text-muted-foreground">ml</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Target: <span className="font-semibold text-foreground">{targetMl} ml</span>
          </p>
          <span className="text-[11px] font-medium text-sky-600 dark:text-sky-400 block pt-1">
            {percentage >= 100
              ? "✨ Target Achieved! Cellular hydration optimal."
              : `${Math.max(0, targetMl - currentMl)} ml remaining for today.`}
          </span>
        </div>
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-border/60">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddWater(250)}
          className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9 border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400"
        >
          <Plus className="w-3.5 h-3.5" />
          +250ml Glass
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddWater(500)}
          className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9 border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400"
        >
          <Plus className="w-3.5 h-3.5" />
          +500ml Bottle
        </Button>
      </div>
    </div>
  )
}
