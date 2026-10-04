"use client"

import React from "react"
import { Timer, Zap, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RestTimerRingProps {
  secondsRemaining: number
  totalSeconds: number
  onAddSeconds: (secs: number) => void
  onSkip: () => void
}

export function RestTimerRing({
  secondsRemaining,
  totalSeconds,
  onAddSeconds,
  onSkip,
}: RestTimerRingProps) {
  const size = 180
  const center = size / 2
  const radius = 70
  const circumference = 2 * Math.PI * radius

  const progress = Math.max(0, Math.min(1, secondsRemaining / (totalSeconds || 1)))
  const offset = circumference - progress * circumference

  const formatSeconds = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-5 rounded-2xl border border-primary/30 bg-gradient-to-r from-card via-card to-primary/10 shadow-lg backdrop-blur-md relative overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Background ambient ring glow */}
      <div className="absolute top-1/2 left-20 -translate-x-1/2 -translate-y-1/2 w-44 h-44 bg-primary/15 rounded-full blur-2xl pointer-events-none" />

      {/* Radial SVG Countdown */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 select-none filter drop-shadow-md"
        >
          <defs>
            <linearGradient id="restRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-secondary"
          />

          {/* Active progress countdown ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke="url(#restRingGrad)"
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>

        {/* Center Countdown Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <Zap className="w-4 h-4 text-primary animate-bounce mb-0.5" />
          <span className="text-2xl font-black font-mono tracking-tight text-foreground">
            {formatSeconds(secondsRemaining)}
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">
            Rest Interval
          </span>
        </div>
      </div>

      {/* Info & Tactile Controls */}
      <div className="space-y-3 text-center sm:text-left flex-1">
        <div>
          <h4 className="text-base font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-1.5">
            <Timer className="w-4 h-4 text-primary" />
            Active Muscle Recovery Phase
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Allowing ATP-CP cellular stores to resynthesize for maximum force output on your next set.
          </p>
        </div>

        <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddSeconds(15)}
            className="text-xs font-bold h-8 px-3 border-border/80"
          >
            +15s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddSeconds(30)}
            className="text-xs font-bold h-8 px-3 border-border/80"
          >
            +30s
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSkip}
            className="text-xs font-bold uppercase tracking-wider h-8 px-4 bg-primary text-primary-foreground gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Ready Now (Skip)
          </Button>
        </div>
      </div>
    </div>
  )
}
