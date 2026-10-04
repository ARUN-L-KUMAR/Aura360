"use client"

import React, { useState } from "react"
import { Flame, Dumbbell, Wheat, Droplet, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface MacroRingsProps {
  calories: { current: number; target: number }
  protein: { current: number; target: number }
  carbs: { current: number; target: number }
  fats: { current: number; target: number }
}

export function MacroRings({
  calories,
  protein,
  carbs,
  fats,
}: MacroRingsProps) {
  const [hoveredRing, setHoveredRing] = useState<string | null>(null)

  // Calculations
  const calPct = Math.min(100, Math.round((calories.current / (calories.target || 1)) * 100))
  const proPct = Math.min(100, Math.round((protein.current / (protein.target || 1)) * 100))
  const carbPct = Math.min(100, Math.round((carbs.current / (carbs.target || 1)) * 100))
  const fatPct = Math.min(100, Math.round((fats.current / (fats.target || 1)) * 100))

  // Geometry
  const size = 260
  const center = size / 2

  // Ring 1: Calories (Outer)
  const r1 = 105
  const circ1 = 2 * Math.PI * r1
  const offset1 = circ1 - (calPct / 100) * circ1

  // Ring 2: Protein (Middle)
  const r2 = 82
  const circ2 = 2 * Math.PI * r2
  const offset2 = circ2 - (proPct / 100) * circ2

  // Ring 3: Carbs (Inner-Middle)
  const r3 = 59
  const circ3 = 2 * Math.PI * r3
  const offset3 = circ3 - (carbPct / 100) * circ3

  // Ring 4: Fats (Core)
  const r4 = 38
  const circ4 = 2 * Math.PI * r4
  const offset4 = circ4 - (fatPct / 100) * circ4

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between gap-6 p-4 sm:p-6 bg-gradient-to-br from-card via-card/90 to-primary/5 rounded-2xl border border-border/80 shadow-md relative overflow-hidden backdrop-blur-md">
      {/* Background ambient glow */}
      <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* SVG Concentric Multi-Ring */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90 filter drop-shadow-md select-none"
        >
          <defs>
            {/* Calories Gradient */}
            <linearGradient id="calGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#fb7185" />
            </linearGradient>
            {/* Protein Gradient */}
            <linearGradient id="proGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#34d399" />
            </linearGradient>
            {/* Carbs Gradient */}
            <linearGradient id="carbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
            {/* Fats Gradient */}
            <linearGradient id="fatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Background Track 1: Calories */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="currentColor"
            strokeWidth="14"
            fill="transparent"
            className="text-rose-500/15"
          />
          {/* Active Ring 1: Calories */}
          <circle
            cx={center}
            cy={center}
            r={r1}
            stroke="url(#calGrad)"
            strokeWidth="14"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circ1}
            strokeDashoffset={offset1}
            className="transition-all duration-1000 ease-out"
            onMouseEnter={() => setHoveredRing("calories")}
            onMouseLeave={() => setHoveredRing(null)}
          />

          {/* Background Track 2: Protein */}
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="currentColor"
            strokeWidth="13"
            fill="transparent"
            className="text-emerald-500/15"
          />
          {/* Active Ring 2: Protein */}
          <circle
            cx={center}
            cy={center}
            r={r2}
            stroke="url(#proGrad)"
            strokeWidth="13"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circ2}
            strokeDashoffset={offset2}
            className="transition-all duration-1000 ease-out"
            onMouseEnter={() => setHoveredRing("protein")}
            onMouseLeave={() => setHoveredRing(null)}
          />

          {/* Background Track 3: Carbs */}
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="currentColor"
            strokeWidth="12"
            fill="transparent"
            className="text-amber-500/15"
          />
          {/* Active Ring 3: Carbs */}
          <circle
            cx={center}
            cy={center}
            r={r3}
            stroke="url(#carbGrad)"
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circ3}
            strokeDashoffset={offset3}
            className="transition-all duration-1000 ease-out"
            onMouseEnter={() => setHoveredRing("carbs")}
            onMouseLeave={() => setHoveredRing(null)}
          />

          {/* Background Track 4: Fats */}
          <circle
            cx={center}
            cy={center}
            r={r4}
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-cyan-500/15"
          />
          {/* Active Ring 4: Fats */}
          <circle
            cx={center}
            cy={center}
            r={r4}
            stroke="url(#fatGrad)"
            strokeWidth="10"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circ4}
            strokeDashoffset={offset4}
            className="transition-all duration-1000 ease-out"
            onMouseEnter={() => setHoveredRing("fats")}
            onMouseLeave={() => setHoveredRing(null)}
          />
        </svg>

        {/* Center Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <Flame className="w-5 h-5 text-rose-500 animate-pulse mb-0.5" />
          <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-foreground">
            {calories.current}
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
            / {calories.target} kcal
          </span>
        </div>
      </div>

      {/* Interactive Legend & Macro Pills */}
      <div className="flex-1 grid grid-cols-2 gap-3 w-full">
        {/* Calories Card */}
        <div
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer space-y-1 relative overflow-hidden",
            hoveredRing === "calories"
              ? "bg-rose-500/10 border-rose-500/50 shadow-md scale-102"
              : "bg-secondary/40 border-border hover:border-rose-500/30"
          )}
          onMouseEnter={() => setHoveredRing("calories")}
          onMouseLeave={() => setHoveredRing(null)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Flame className="w-3 h-3" />
              Calories
            </span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground">{calPct}%</span>
          </div>
          <div className="font-mono text-base font-extrabold text-foreground">
            {calories.current}{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {calories.target}</span>
          </div>
          <div className="w-full bg-rose-500/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${calPct}%` }}
            />
          </div>
        </div>

        {/* Protein Card */}
        <div
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer space-y-1 relative overflow-hidden",
            hoveredRing === "protein"
              ? "bg-emerald-500/10 border-emerald-500/50 shadow-md scale-102"
              : "bg-secondary/40 border-border hover:border-emerald-500/30"
          )}
          onMouseEnter={() => setHoveredRing("protein")}
          onMouseLeave={() => setHoveredRing(null)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              Protein
            </span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground">{proPct}%</span>
          </div>
          <div className="font-mono text-base font-extrabold text-foreground">
            {Math.round(protein.current)}g{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {protein.target}g</span>
          </div>
          <div className="w-full bg-emerald-500/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${proPct}%` }}
            />
          </div>
        </div>

        {/* Carbs Card */}
        <div
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer space-y-1 relative overflow-hidden",
            hoveredRing === "carbs"
              ? "bg-amber-500/10 border-amber-500/50 shadow-md scale-102"
              : "bg-secondary/40 border-border hover:border-amber-500/30"
          )}
          onMouseEnter={() => setHoveredRing("carbs")}
          onMouseLeave={() => setHoveredRing(null)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
              <Wheat className="w-3 h-3" />
              Carbs
            </span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground">{carbPct}%</span>
          </div>
          <div className="font-mono text-base font-extrabold text-foreground">
            {Math.round(carbs.current)}g{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {carbs.target}g</span>
          </div>
          <div className="w-full bg-amber-500/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${carbPct}%` }}
            />
          </div>
        </div>

        {/* Fats Card */}
        <div
          className={cn(
            "p-3 rounded-xl border transition-all cursor-pointer space-y-1 relative overflow-hidden",
            hoveredRing === "fats"
              ? "bg-cyan-500/10 border-cyan-500/50 shadow-md scale-102"
              : "bg-secondary/40 border-border hover:border-cyan-500/30"
          )}
          onMouseEnter={() => setHoveredRing("fats")}
          onMouseLeave={() => setHoveredRing(null)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 flex items-center gap-1">
              <Droplet className="w-3 h-3" />
              Fats
            </span>
            <span className="text-[10px] font-bold font-mono text-muted-foreground">{fatPct}%</span>
          </div>
          <div className="font-mono text-base font-extrabold text-foreground">
            {Math.round(fats.current)}g{" "}
            <span className="text-xs font-normal text-muted-foreground">/ {fats.target}g</span>
          </div>
          <div className="w-full bg-cyan-500/20 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-cyan-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${fatPct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
