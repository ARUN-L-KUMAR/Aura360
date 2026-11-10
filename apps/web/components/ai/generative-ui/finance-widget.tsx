"use client"

import React, { useState } from "react"
import { DollarSign, Check, Sliders, ArrowUpRight, ShieldCheck, PieChart, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export interface FinanceWidgetData {
  title?: string
  totalIncome?: number
  currency?: string
  categories?: {
    name: string
    percentage: number
    color?: string
    description?: string
  }[]
  advice?: string
}

export function FinanceWidget({ data }: { data: FinanceWidgetData }) {
  const router = useRouter()
  const currency = data.currency || "$"
  const total = data.totalIncome || 4000

  const initialCategories = data.categories && data.categories.length > 0
    ? data.categories
    : [
        { name: "Needs (Living & Bills)", percentage: 50, color: "bg-emerald-500", description: "Rent, groceries, utilities" },
        { name: "Wants (Lifestyle)", percentage: 30, color: "bg-amber-500", description: "Dining, hobbies, leisure" },
        { name: "Investments & Savings", percentage: 20, color: "bg-cyan-500", description: "Roth IRA, emergency fund" }
      ]

  const [categories, setCategories] = useState(initialCategories)
  const [isSaved, setIsSaved] = useState(false)

  const handleSliderChange = (index: number, newPercent: number) => {
    const updated = [...categories]
    updated[index].percentage = newPercent
    setCategories(updated)
  }

  const handleDeployBudget = async () => {
    try {
      // Direct commit to budgets or store in session
      sessionStorage.setItem("aura_pending_budget", JSON.stringify({
        totalIncome: total,
        categories,
        deployedAt: new Date().toISOString()
      }))

      setIsSaved(true)
      toast.success("Budget Strategy Deployed!", {
        description: `Allocated ${currency}${total.toLocaleString()} across ${categories.length} pillars.`
      })
    } catch {
      toast.error("Failed to commit budget")
    }
  }

  return (
    <div className="my-3 overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-background to-background p-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
              <DollarSign className="h-4 w-4" />
            </span>
            <h4 className="font-semibold text-foreground text-sm tracking-tight">
              {data.title || "Smart Financial Blueprint"}
            </h4>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 text-[10px]">
              AI Generative Plan
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Target Base: <span className="font-semibold text-foreground">{currency}{total.toLocaleString()}</span> / month
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleDeployBudget}
          disabled={isSaved}
          className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 shadow-md"
        >
          {isSaved ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>Applied</span>
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              <span>Apply Strategy</span>
            </>
          )}
        </Button>
      </div>

      {/* Visual Multi-Segment Bar */}
      <div className="my-3">
        <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1.5">
          <span>Allocation Distribution</span>
          <span>
            Total: {categories.reduce((acc, c) => acc + c.percentage, 0)}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full overflow-hidden flex bg-muted/60 p-0.5 gap-0.5">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              style={{ width: `${Math.max(5, cat.percentage)}%` }}
              className={`h-full rounded-sm transition-all duration-300 ${cat.color || (idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-cyan-500")}`}
              title={`${cat.name}: ${cat.percentage}%`}
            />
          ))}
        </div>
      </div>

      {/* Interactive Category Sliders */}
      <div className="space-y-2.5 my-3">
        {categories.map((cat, idx) => {
          const amount = Math.round((total * cat.percentage) / 100)
          return (
            <div
              key={idx}
              className="rounded-xl border border-border/40 bg-card/60 p-2.5 transition-all hover:border-emerald-500/30"
            >
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${cat.color || (idx === 0 ? "bg-emerald-500" : idx === 1 ? "bg-amber-500" : "bg-cyan-500")}`} />
                  <span className="font-medium text-foreground">{cat.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">{currency}{amount.toLocaleString()}</span>
                  <span className="text-muted-foreground ml-1 font-mono text-[11px]">({cat.percentage}%)</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={cat.percentage}
                onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              {cat.description && (
                <p className="text-[10px] text-muted-foreground mt-1">{cat.description}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Advisory Note */}
      {data.advice && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-foreground/90">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.advice}</p>
        </div>
      )}

      {/* Quick Launch */}
      <div className="mt-3 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/finance")}
          className="text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 gap-1"
        >
          <span>Open Full Finance Hub</span>
          <ArrowUpRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
