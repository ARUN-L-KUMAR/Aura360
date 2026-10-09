"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Clock, Shirt, TrendingUp, IndianRupee } from "lucide-react"
import { toast } from "sonner"
import type { FashionItem } from "@/lib/types/fashion"
import {
  computeWearInsights,
  costPerWear,
  daysSinceWorn,
  localDateString,
  NEGLECTED_AFTER_DAYS,
} from "@/lib/fashion/wear-stats"

interface WearInsightsProps {
  wardrobeItems: FashionItem[]
  onUpdateItem: (item: FashionItem) => void
}

const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

function ItemRow({ item, right }: { item: FashionItem; right: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Shirt className="h-4 w-4 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
      <span className="shrink-0 text-xs text-muted-foreground">{right}</span>
    </div>
  )
}

export function WearInsights({ wardrobeItems, onUpdateItem }: WearInsightsProps) {
  const insights = useMemo(() => computeWearInsights(wardrobeItems), [wardrobeItems])
  const [loggingId, setLoggingId] = useState<string | null>(null)

  const logWorn = async (item: FashionItem) => {
    setLoggingId(item.id)
    try {
      const date = localDateString()
      const response = await fetch("/api/fashion/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_worn", ids: [item.id], date }),
      })
      if (!response.ok) throw new Error("Failed to log wear")
      onUpdateItem({ ...item, wearCount: (item.wearCount ?? 0) + 1, lastWornDate: date })
      toast.success(`Logged ${item.name} as worn today`)
    } catch (error) {
      console.error(error)
      toast.error("Failed to log wear")
    } finally {
      setLoggingId(null)
    }
  }

  if (wardrobeItems.length === 0) return null

  const stats = [
    { label: "Wardrobe value", value: money(insights.totalValue), icon: IndianRupee },
    { label: "Total wears", value: insights.totalWears.toLocaleString("en-IN"), icon: Shirt },
    {
      label: "Avg cost / wear",
      value: insights.avgCostPerWear === null ? "—" : money(insights.avgCostPerWear),
      icon: TrendingUp,
    },
    { label: "Neglected", value: String(insights.neglected.length), icon: Clock },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">Wear Insights</h2>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Neglected = unworn {NEGLECTED_AFTER_DAYS}+ days
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <Icon className="h-4 w-4 text-muted-foreground/60" />
            </div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Most worn</h3>
          {insights.mostWorn.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No wears logged yet.</p>
          ) : (
            insights.mostWorn.map((item) => (
              <ItemRow key={item.id} item={item} right={`${item.wearCount}×`} />
            ))
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Best value</h3>
          {insights.bestValue.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Needs worn items with a price.</p>
          ) : (
            insights.bestValue.map((item) => (
              <ItemRow key={item.id} item={item} right={`${money(costPerWear(item) ?? 0)}/wear`} />
            ))
          )}
        </div>

        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Needs some love</h3>
          {insights.neglected.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">Everything's getting worn. Nice.</p>
          ) : (
            insights.neglected.slice(0, 3).map((item) => {
              const since = daysSinceWorn(item)
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  right={
                    <span className="flex items-center gap-2">
                      {since === null ? "never" : `${since}d`}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[9px] font-bold uppercase tracking-widest"
                        disabled={loggingId === item.id}
                        onClick={() => logWorn(item)}
                      >
                        Wore it
                      </Button>
                    </span>
                  }
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
