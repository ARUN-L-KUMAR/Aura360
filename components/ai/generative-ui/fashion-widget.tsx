"use client"

import React, { useState } from "react"
import { Shirt, Sparkles, Check, ArrowUpRight, Palette, CloudSun, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface FashionWidgetData {
  title?: string
  vibe?: string
  occasion?: string
  weatherMatch?: string
  harmonyScore?: number
  palette?: { name: string; hex: string }[]
  items?: {
    category: string
    name: string
    color: string
    colorHex?: string
    notes?: string
  }[]
  stylingTip?: string
}

export function FashionWidget({ data }: { data: FashionWidgetData }) {
  const router = useRouter()
  const [isWorn, setIsWorn] = useState(false)
  const [activePaletteIndex, setActivePaletteIndex] = useState<number | null>(null)

  const items = data.items || [
    { category: "Top", name: "Heavyweight Boxy Tee", color: "Oatmeal Beige", colorHex: "#E6DFD5", notes: "100% Organic Cotton" },
    { category: "Outerwear", name: "Structured Overshirt", color: "Charcoal Slate", colorHex: "#2D3748", notes: "Textured weave" },
    { category: "Bottom", name: "Pleated Relaxed Trousers", color: "Espresso Brown", colorHex: "#3D2B1F", notes: "Straight drape" },
    { category: "Footwear", name: "Clean Minimalist Sneakers", color: "Off-White / Gum", colorHex: "#F7FAFC", notes: "Low profile" },
    { category: "Accessory", name: "Brushed Steel Watch", color: "Silver", colorHex: "#CBD5E0", notes: "Minimal dial" }
  ]

  const palette = data.palette || [
    { name: "Oatmeal", hex: "#E6DFD5" },
    { name: "Charcoal", hex: "#2D3748" },
    { name: "Espresso", hex: "#3D2B1F" },
    { name: "Off-White", hex: "#F7FAFC" }
  ]

  const handleWearToday = () => {
    sessionStorage.setItem("aura_today_outfit", JSON.stringify({
      title: data.title || "Curated Capsule Look",
      items,
      palette,
      loggedAt: new Date().toISOString()
    }))
    setIsWorn(true)
    toast.success("Outfit Logged for Today!", {
      description: "Added to your digital wardrobe diary."
    })
  }

  const copyHex = (hex: string, name: string, idx: number) => {
    navigator.clipboard.writeText(hex)
    setActivePaletteIndex(idx)
    toast.info(`Copied ${name} (${hex}) to clipboard!`)
    setTimeout(() => setActivePaletteIndex(null), 2000)
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/20 via-background to-background p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/40">
              <Shirt className="h-4 w-4" />
            </span>
            <h4 className="font-semibold text-foreground text-sm tracking-tight">
              {data.title || "Curated Capsule Look"}
            </h4>
            <Badge variant="outline" className="border-purple-500/40 text-purple-400 text-[10px]">
              AI Stylist
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {data.vibe && (
              <span className="text-[11px] font-medium text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {data.vibe}
              </span>
            )}
            {data.weatherMatch && (
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <CloudSun className="h-3 w-3 text-amber-400" />
                {data.weatherMatch}
              </span>
            )}
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleWearToday}
          disabled={isWorn}
          className="h-8 gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 shadow-md"
        >
          {isWorn ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Wearing Today</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Wear This Look</span>
            </>
          )}
        </Button>
      </div>

      {/* Color Palette Strip */}
      <div className="my-3 flex items-center justify-between rounded-xl bg-card/60 p-2 border border-border/40">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Palette className="h-3.5 w-3.5 text-purple-400" />
          <span className="text-[11px]">Color Palette:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {palette.map((p, idx) => (
            <button
              key={idx}
              onClick={() => copyHex(p.hex, p.name, idx)}
              className="group relative flex items-center gap-1 rounded-md px-1.5 py-0.5 border border-border/50 hover:border-purple-400 transition-colors"
              title={`Click to copy: ${p.name} (${p.hex})`}
            >
              <span
                className="h-3.5 w-3.5 rounded-full border border-black/20 shadow-xs"
                style={{ backgroundColor: p.hex }}
              />
              <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
                {p.name}
              </span>
              {activePaletteIndex === idx && (
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded shadow">
                  Copied!
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Wardrobe Items Breakdown */}
      <div className="space-y-2 my-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 p-2.5 hover:bg-card/70 transition-colors text-xs"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="h-4 w-4 rounded-full border border-white/20 shrink-0 shadow-2xs"
                style={{ backgroundColor: item.colorHex || "#888888" }}
              />
              <div>
                <span className="font-semibold text-foreground">{item.name}</span>
                <span className="text-muted-foreground ml-1.5 font-normal text-[11px]">({item.category})</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-foreground/90 font-medium">{item.color}</span>
              {item.notes && (
                <span className="block text-[10px] text-muted-foreground">{item.notes}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Styling Tip */}
      {data.stylingTip && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-purple-500/10 border border-purple-500/20 p-2.5 text-xs text-foreground/90">
          <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.stylingTip}</p>
        </div>
      )}

      {/* Quick Launch */}
      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/fashion")}
          className="text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 h-7 gap-1"
        >
          <span>Open Wardrobe Studio</span>
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
