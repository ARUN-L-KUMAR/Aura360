"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Sparkles,
  Zap,
  TrendingUp,
  Shield,
  Heart,
  Sliders,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PieChart,
  DollarSign,
  ChevronRight,
  Flame,
  Clock,
  Layers,
  Check,
  RotateCcw,
  Wallet,
  Building,
  Utensils,
  Lightbulb,
  ArrowUpRight,
  TrendingDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Transaction } from "@/lib/types/finance"

interface FinanceAiDesignerTabProps {
  transactions?: Transaction[]
  onDeploySuccess?: () => void
}

type FrameworkKey = "50-30-20" | "fire" | "70-20-10" | "zero-based" | "custom"

interface CategoryAllocation {
  name: string
  amount: number
}

interface PillarAllocation {
  percentage: number
  amount: number
  categories: CategoryAllocation[]
}

interface BlueprintData {
  monthlyIncome: number
  framework: FrameworkKey
  allocation: {
    needs: PillarAllocation
    wants: PillarAllocation
    wealth: PillarAllocation
  }
  metrics: {
    projectedAnnualSavings: number
    projectedYearOneNetWorthIncrease: number
    emergencyRunwayMonths: number
    debtFreedomAccelerationMonths: number
  }
  insights: string[]
}

const FRAMEWORK_PRESETS: {
  key: FrameworkKey
  label: string
  tagline: string
  needs: number
  wants: number
  wealth: number
  icon: string
  color: string
}[] = [
  {
    key: "50-30-20",
    label: "50 / 30 / 20 Balanced",
    tagline: "The golden standard for sustainable living and steady wealth.",
    needs: 50,
    wants: 30,
    wealth: 20,
    icon: "⚖️",
    color: "from-blue-500/20 to-indigo-500/20 text-blue-500",
  },
  {
    key: "fire",
    label: "FIRE Accelerator",
    tagline: "Aggressive wealth accumulation for early financial independence.",
    needs: 35,
    wants: 15,
    wealth: 50,
    icon: "🔥",
    color: "from-amber-500/20 to-orange-500/20 text-amber-500",
  },
  {
    key: "70-20-10",
    label: "70 / 20 / 10 Wealth Builder",
    tagline: "Practical approach prioritizing solid investment habits.",
    needs: 70,
    wants: 10,
    wealth: 20,
    icon: "🏗️",
    color: "from-emerald-500/20 to-teal-500/20 text-emerald-500",
  },
  {
    key: "zero-based",
    label: "Zero-Based Allocation",
    tagline: "Give every single dollar an intentional mission before the month starts.",
    needs: 55,
    wants: 25,
    wealth: 20,
    icon: "🎯",
    color: "from-purple-500/20 to-pink-500/20 text-purple-500",
  },
]

export function FinanceAiDesignerTab({ transactions = [], onDeploySuccess }: FinanceAiDesignerTabProps) {
  // Detect baseline income from transaction ledger
  const detectedIncome = useMemo(() => {
    const incomeTxns = transactions.filter((t) => t.type === "income")
    if (incomeTxns.length === 0) return 4500
    const total = incomeTxns.reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0)
    // Assume over last ~60 days, return monthly rate
    return Math.max(Math.round(total / 2), 1500)
  }, [transactions])

  const [framework, setFramework] = useState<FrameworkKey>("50-30-20")
  const [monthlyIncome, setMonthlyIncome] = useState<number>(detectedIncome)
  const [needsPct, setNeedsPct] = useState<number>(50)
  const [wantsPct, setWantsPct] = useState<number>(30)
  const [wealthPct, setWealthPct] = useState<number>(20)

  // Simulation Levers
  const [simCutWants, setSimCutWants] = useState<boolean>(false)
  const [simCancelSubs, setSimCancelSubs] = useState<boolean>(false)
  const [simIncomeBoost, setSimIncomeBoost] = useState<boolean>(false)

  const [blueprint, setBlueprint] = useState<BlueprintData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)

  // Sync income if detected changes and user hasn't modified it
  useEffect(() => {
    if (detectedIncome && detectedIncome !== 4500) {
      setMonthlyIncome(detectedIncome)
    }
  }, [detectedIncome])

  // Select Preset Framework
  const handleSelectFramework = (key: FrameworkKey) => {
    setFramework(key)
    const preset = FRAMEWORK_PRESETS.find((p) => p.key === key)
    if (preset) {
      setNeedsPct(preset.needs)
      setWantsPct(preset.wants)
      setWealthPct(preset.wealth)
    }
  }

  // Calculate live dollar amounts
  const effectiveIncome = useMemo(() => {
    let inc = monthlyIncome
    if (simIncomeBoost) inc *= 1.1 // +10% income boost
    return Math.round(inc)
  }, [monthlyIncome, simIncomeBoost])

  const needsAmount = Math.round(effectiveIncome * (needsPct / 100))
  let wantsAmount = Math.round(effectiveIncome * (wantsPct / 100))
  if (simCutWants) wantsAmount = Math.max(0, wantsAmount - 200)
  if (simCancelSubs) wantsAmount = Math.max(0, wantsAmount - 45)

  const wealthAmount = effectiveIncome - needsAmount - wantsAmount
  const currentTotalPct = needsPct + wantsPct + wealthPct

  // 1-Year & 5-Year Projections with Compound Growth (assumed 7% market return)
  const annualSavings = wealthAmount * 12
  const fiveYearCompound = useMemo(() => {
    let balance = 0
    const monthlyRate = 0.07 / 12
    for (let m = 0; m < 60; m++) {
      balance = (balance + wealthAmount) * (1 + monthlyRate)
    }
    return Math.round(balance)
  }, [wealthAmount])

  // Emergency runway: how many months of essentials (needs) can be covered by 1 year of savings
  const emergencyRunwayMonths = needsAmount > 0 ? (annualSavings / needsAmount).toFixed(1) : "12+"

  // Generate / Redesign AI Blueprint via API
  const handleGenerateAiBlueprint = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/finance/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          framework,
          targetMonthlyIncome: effectiveIncome,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate AI blueprint")
      }

      setBlueprint(data.blueprint)
      if (data.blueprint?.allocation) {
        setNeedsPct(data.blueprint.allocation.needs.percentage)
        setWantsPct(data.blueprint.allocation.wants.percentage)
        setWealthPct(data.blueprint.allocation.wealth.percentage)
      }
      toast.success("AI Blueprint formulated successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to generate blueprint")
    } finally {
      setIsGenerating(false)
    }
  }

  // Load initial AI blueprint on mount
  useEffect(() => {
    handleGenerateAiBlueprint()
  }, [framework])

  // Deploy Designed Blueprint into Active Budgets
  const handleDeployToBudgets = async () => {
    setIsDeploying(true)
    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`

    const categoriesToDeploy: { category: string; amount: number }[] = []

    if (blueprint?.allocation) {
      blueprint.allocation.needs.categories.forEach((c) =>
        categoriesToDeploy.push({ category: c.name, amount: c.amount })
      )
      blueprint.allocation.wants.categories.forEach((c) =>
        categoriesToDeploy.push({ category: c.name, amount: c.amount })
      )
      blueprint.allocation.wealth.categories.forEach((c) =>
        categoriesToDeploy.push({ category: c.name, amount: c.amount })
      )
    } else {
      categoriesToDeploy.push(
        { category: "Housing", amount: Math.round(needsAmount * 0.55) },
        { category: "Groceries", amount: Math.round(needsAmount * 0.25) },
        { category: "Utilities", amount: Math.round(needsAmount * 0.12) },
        { category: "Transport", amount: Math.round(needsAmount * 0.08) },
        { category: "Dining Out", amount: Math.round(wantsAmount * 0.45) },
        { category: "Shopping", amount: Math.round(wantsAmount * 0.35) },
        { category: "Entertainment", amount: Math.round(wantsAmount * 0.2) },
        { category: "Emergency Fund", amount: Math.round(wealthAmount * 0.45) },
        { category: "Investments", amount: Math.round(wealthAmount * 0.55) }
      )
    }

    try {
      let deployedCount = 0
      for (const item of categoriesToDeploy) {
        if (item.amount <= 0) continue
        await fetch("/api/finance/budgets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: item.category,
            amount: item.amount,
            period: "monthly",
            month: currentMonth,
            alertThreshold: 85,
          }),
        })
        deployedCount++
      }

      toast.success(`Successfully deployed ${deployedCount} category budgets to ${currentMonth}!`)
      if (onDeploySuccess) onDeploySuccess()
    } catch (err: any) {
      toast.error(err.message || "Failed to deploy budgets")
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ── Studio Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-linear-to-br from-card via-card/90 to-primary/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" />
              AI Financial Architecture Studio
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Design & Deploy Your Capital Blueprint
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Model your monthly cashflow across Essentials, Lifestyle, and Wealth creation. Simulate real-time scenarios and deploy directly into your active ledger budgets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={handleGenerateAiBlueprint}
              disabled={isGenerating}
              variant="outline"
              className="gap-2 text-xs font-semibold h-9 px-4 border-primary/30 hover:bg-primary/10 hover:text-primary shadow-xs"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 text-primary", isGenerating && "animate-spin")} />
              {isGenerating ? "Analyzing Cashflow..." : "AI Auto-Redesign"}
            </Button>

            <Button
              onClick={handleDeployToBudgets}
              disabled={isDeploying}
              className="gap-2 text-xs font-semibold h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
            >
              <Check className="h-3.5 w-3.5" />
              {isDeploying ? "Deploying..." : "Deploy Blueprint to Budgets"}
            </Button>
          </div>
        </div>

        {/* Live Metrics Header Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/60">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Monthly Inflow
            </span>
            <p className="text-base sm:text-lg font-bold text-foreground">
              ${effectiveIncome.toLocaleString()}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Essentials (Needs)
            </span>
            <p className="text-base sm:text-lg font-bold text-sky-500">
              ${needsAmount.toLocaleString()} ({needsPct}%)
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Lifestyle (Wants)
            </span>
            <p className="text-base sm:text-lg font-bold text-amber-500">
              ${wantsAmount.toLocaleString()} ({Math.round((wantsAmount / effectiveIncome) * 100)}%)
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Wealth Accumulation
            </span>
            <p className="text-base sm:text-lg font-bold text-emerald-500">
              ${wealthAmount.toLocaleString()} ({Math.round((wealthAmount / effectiveIncome) * 100)}%)
            </p>
          </div>
        </div>
      </div>

      {/* ── Framework Presets ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            1. Select Strategy Framework
          </h3>
          <span className="text-xs text-muted-foreground">Choose an archetype or adjust sliders below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FRAMEWORK_PRESETS.map((preset) => {
            const isSelected = framework === preset.key
            return (
              <div
                key={preset.key}
                onClick={() => handleSelectFramework(preset.key)}
                className={cn(
                  "p-4 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between space-y-3 bg-card shadow-2xs",
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 bg-primary/5 shadow-xs"
                    : "border-border/70 hover:border-border hover:bg-muted/30"
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{preset.icon}</span>
                    {isSelected && (
                      <Badge className="h-5 px-1.5 text-[10px] bg-primary text-primary-foreground font-semibold">
                        Active
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{preset.label}</h4>
                  <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                    {preset.tagline}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
                  <span>{preset.needs}% Needs</span>
                  <span>{preset.wants}% Wants</span>
                  <span className="text-emerald-500 font-semibold">{preset.wealth}% Wealth</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Interactive Money Flow Canvas ── */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                2. Visual Money Flow Architecture
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Real-time capital distribution pipeline showing where every dollar travels.
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-mono font-semibold px-2.5 py-0.5",
                  currentTotalPct === 100
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                    : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                )}
              >
                {currentTotalPct === 100
                  ? "✓ 100% Balanced Allocation"
                  : `Allocation: ${currentTotalPct}% (${currentTotalPct > 100 ? "Over" : "Under"} allocated)`}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Continuous Multi-Segment Bar */}
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded-full bg-muted/60 overflow-hidden flex shadow-inner">
              <div
                style={{ width: `${needsPct}%` }}
                className="h-full bg-linear-to-r from-sky-500 to-indigo-500 transition-all duration-300"
                title={`Needs: ${needsPct}% ($${needsAmount})`}
              />
              <div
                style={{ width: `${wantsPct}%` }}
                className="h-full bg-linear-to-r from-amber-400 to-orange-500 transition-all duration-300"
                title={`Wants: ${wantsPct}% ($${wantsAmount})`}
              />
              <div
                style={{ width: `${Math.max(0, 100 - needsPct - wantsPct)}%` }}
                className="h-full bg-linear-to-r from-emerald-400 to-teal-500 transition-all duration-300"
                title={`Wealth Engine: ${wealthPct}% ($${wealthAmount})`}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="font-medium text-foreground">Essentials</span>
                <span>${needsAmount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span className="font-medium text-foreground">Lifestyle</span>
                <span>${wantsAmount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="font-medium text-foreground">Wealth Engine</span>
                <span className="text-emerald-500 font-semibold">${wealthAmount}</span>
              </div>
            </div>
          </div>

          {/* Interactive Sliders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 border-t border-border/60">
            {/* Needs Slider */}
            <div className="space-y-3 p-4 rounded-xl bg-card border border-sky-500/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-sky-500" />
                  <span className="text-xs font-bold text-foreground">Essentials (Needs)</span>
                </div>
                <span className="text-xs font-mono font-bold text-sky-500">{needsPct}%</span>
              </div>
              <Slider
                value={[needsPct]}
                min={20}
                max={80}
                step={1}
                onValueChange={(val) => {
                  setNeedsPct(val[0])
                  setFramework("custom")
                }}
                className="py-1"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Housing, Food, Utilities</span>
                <span className="font-semibold text-foreground">${needsAmount}/mo</span>
              </div>
            </div>

            {/* Wants Slider */}
            <div className="space-y-3 p-4 rounded-xl bg-card border border-amber-500/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-foreground">Lifestyle (Wants)</span>
                </div>
                <span className="text-xs font-mono font-bold text-amber-500">{wantsPct}%</span>
              </div>
              <Slider
                value={[wantsPct]}
                min={5}
                max={60}
                step={1}
                onValueChange={(val) => {
                  setWantsPct(val[0])
                  setFramework("custom")
                }}
                className="py-1"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Dining, Entertainment, Travel</span>
                <span className="font-semibold text-foreground">${wantsAmount}/mo</span>
              </div>
            </div>

            {/* Wealth / Savings Slider */}
            <div className="space-y-3 p-4 rounded-xl bg-card border border-emerald-500/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-bold text-foreground">Wealth (Investing)</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-500">{wealthPct}%</span>
              </div>
              <Slider
                value={[wealthPct]}
                min={5}
                max={70}
                step={1}
                onValueChange={(val) => {
                  setWealthPct(val[0])
                  setFramework("custom")
                }}
                className="py-1"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span>Emergency, Stocks, Goals</span>
                <span className="font-semibold text-emerald-500">${wealthAmount}/mo</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Sub-Category Envelopes Grid ── */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          3. Detailed Category Envelopes
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs Envelope */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="py-3 px-4 bg-sky-500/5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-sky-500" />
                  Essential Envelopes
                </span>
                <span className="text-xs font-mono font-bold text-sky-500">${needsAmount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {(blueprint?.allocation?.needs?.categories || [
                { name: "Housing & Rent", amount: Math.round(needsAmount * 0.55) },
                { name: "Groceries", amount: Math.round(needsAmount * 0.22) },
                { name: "Utilities & Bills", amount: Math.round(needsAmount * 0.12) },
                { name: "Transportation", amount: Math.round(needsAmount * 0.11) },
              ]).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/40">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-mono font-medium text-foreground">${c.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Wants Envelope */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="py-3 px-4 bg-amber-500/5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-amber-500" />
                  Lifestyle Envelopes
                </span>
                <span className="text-xs font-mono font-bold text-amber-500">${wantsAmount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {(blueprint?.allocation?.wants?.categories || [
                { name: "Dining Out & Cafes", amount: Math.round(wantsAmount * 0.45) },
                { name: "Shopping & Apparel", amount: Math.round(wantsAmount * 0.3) },
                { name: "Entertainment", amount: Math.round(wantsAmount * 0.15) },
                { name: "Subscriptions", amount: Math.round(wantsAmount * 0.1) },
              ]).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/40">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-mono font-medium text-foreground">${c.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Wealth Envelope */}
          <Card className="border-border/80 shadow-2xs">
            <CardHeader className="py-3 px-4 bg-emerald-500/5 border-b border-border/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  Wealth & Savings Envelopes
                </span>
                <span className="text-xs font-mono font-bold text-emerald-500">${wealthAmount}</span>
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {(blueprint?.allocation?.wealth?.categories || [
                { name: "Emergency Cushion", amount: Math.round(wealthAmount * 0.45) },
                { name: "Index Funds & Stocks", amount: Math.round(wealthAmount * 0.4) },
                { name: "Savings Goals", amount: Math.round(wealthAmount * 0.15) },
              ]).map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded-md hover:bg-muted/40">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-mono font-medium text-emerald-500 font-semibold">${c.amount}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Interactive "What-If" Scenario Simulator ── */}
      <Card className="border border-border/80 shadow-xs bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                4. Interactive "What-If" Scenario Simulator
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Toggle scenario levers to instantly visualize their impact on your 1-year net worth and emergency runway.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Toggle Levers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => setSimCutWants(!simCutWants)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all text-xs flex items-center justify-between",
                simCutWants
                  ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                  : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div>
                <p className="font-semibold text-foreground">Trim Dining by $200</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Cook more meals at home</p>
              </div>
              <Badge variant={simCutWants ? "default" : "outline"} className="text-[10px]">
                {simCutWants ? "Active" : "+$2,400/yr"}
              </Badge>
            </button>

            <button
              onClick={() => setSimCancelSubs(!simCancelSubs)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all text-xs flex items-center justify-between",
                simCancelSubs
                  ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                  : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div>
                <p className="font-semibold text-foreground">Cancel Unused Subs</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Prune recurring subscriptions</p>
              </div>
              <Badge variant={simCancelSubs ? "default" : "outline"} className="text-[10px]">
                {simCancelSubs ? "Active" : "+$540/yr"}
              </Badge>
            </button>

            <button
              onClick={() => setSimIncomeBoost(!simIncomeBoost)}
              className={cn(
                "p-3 rounded-xl border text-left transition-all text-xs flex items-center justify-between",
                simIncomeBoost
                  ? "bg-primary/10 border-primary/40 text-foreground font-semibold"
                  : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div>
                <p className="font-semibold text-foreground">+10% Income Growth</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Bonus, raise, or freelance</p>
              </div>
              <Badge variant={simIncomeBoost ? "default" : "outline"} className="text-[10px]">
                {simIncomeBoost ? "Active" : "+10% Inflow"}
              </Badge>
            </button>
          </div>

          {/* Simulated Impact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  1-Year Savings Trajectory
                </span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-foreground">
                ${annualSavings.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Unallocated capital channeled directly into wealth reserves
              </p>
            </div>

            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  5-Year Compound Growth
                </span>
                <Zap className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xl font-bold text-foreground">
                ${fiveYearCompound.toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Assuming 7% long-term annualized index return
              </p>
            </div>

            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                  Emergency Runway
                </span>
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-xl font-bold text-foreground">
                {emergencyRunwayMonths} Months
              </p>
              <p className="text-[10px] text-muted-foreground">
                Coverage for core monthly living expenses ($ {needsAmount}/mo)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Strategic Observations ── */}
      {blueprint?.insights && blueprint.insights.length > 0 && (
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="py-3 px-5 border-b border-border/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center gap-2 text-foreground">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              AI Strategic Observations & Levers
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-2.5">
            {blueprint.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed">
                <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="flex-1">{insight}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
