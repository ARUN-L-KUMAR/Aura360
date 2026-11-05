"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Sparkles,
  UtensilsCrossed,
  Flame,
  Check,
  Plus,
  Trash2,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ArrowRight,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FoodQuickLogTabProps {
  onMealLogged: () => void
  defaultMealType?: string
}

export function FoodQuickLogTab({
  onMealLogged,
  defaultMealType = "lunch",
}: FoodQuickLogTabProps) {
  const [mealInput, setMealInput] = useState("")
  const [selectedMealType, setSelectedMealType] = useState<string>(defaultMealType)
  const [isParsing, setIsParsing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [parsedResult, setParsedResult] = useState<any | null>(null)

  const examplePrompts = [
    "2 scrambled eggs on sourdough with half an avocado and black coffee",
    "Grilled chicken breast (200g) with white rice, steamed broccoli, and olive oil",
    "Whey protein shake with 1 banana, 20g peanut butter, and almond milk",
    "Salmon poke bowl with edamame, cucumber, sushi rice, and spicy mayo",
  ]

  // ─── Parse with AI ────────────────────────────────────────────────────────
  const handleParseMeal = async () => {
    if (!mealInput.trim()) {
      toast.error("Please describe what you ate first")
      return
    }

    setIsParsing(true)
    try {
      const res = await fetch("/api/food/ai-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "parse_natural_meal",
          params: {
            mealText: mealInput.trim(),
            mealType: selectedMealType,
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to parse meal")
      const result = await res.json()

      if (result.success && result.data) {
        setParsedResult(result.data)
        toast.success("Meal parsed with nutrition estimates!")
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to parse meal description")
    } finally {
      setIsParsing(false)
    }
  }

  // ─── Commit Parsed Food Items to Database ─────────────────────────────────
  const handleCommitMeals = async () => {
    if (!parsedResult || !Array.isArray(parsedResult.items) || parsedResult.items.length === 0) {
      return
    }

    setIsSubmitting(true)
    try {
      const todayStr = new Date().toISOString().split("T")[0]

      // Post each discrete item into /api/food
      for (const item of parsedResult.items) {
        await fetch("/api/food", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: todayStr,
            mealType: selectedMealType,
            foodName: item.foodName,
            quantity: item.quantity || 1,
            unit: item.unit || "serving",
            calories: item.calories || 0,
            protein: item.protein || 0,
            carbs: item.carbs || 0,
            fats: item.fats || 0,
            fiber: item.fiber || 0,
            sugar: item.sugar || 0,
            notes: `AI Parsed: "${mealInput.slice(0, 50)}..."`,
          }),
        })
      }

      toast.success(
        `Successfully logged ${parsedResult.items.length} items to ${selectedMealType}!`,
        { icon: "🥗" }
      )
      setMealInput("")
      setParsedResult(null)
      onMealLogged()
    } catch (err) {
      console.error(err)
      toast.error("Failed to save meals to log")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Edit item in parsed list
  const handleUpdateParsedItem = (index: number, field: string, value: any) => {
    setParsedResult((prev: any) => {
      if (!prev) return prev
      const copy = { ...prev }
      copy.items[index][field] = value

      // Re-sum totals
      copy.totalCalories = copy.items.reduce((s: number, i: any) => s + (Number(i.calories) || 0), 0)
      copy.totalProtein = copy.items.reduce((s: number, i: any) => s + (Number(i.protein) || 0), 0)
      copy.totalCarbs = copy.items.reduce((s: number, i: any) => s + (Number(i.carbs) || 0), 0)
      copy.totalFats = copy.items.reduce((s: number, i: any) => s + (Number(i.fats) || 0), 0)

      return copy
    })
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-sm">
        <CardHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">
                Natural Language AI Food Logger
              </CardTitle>
              <CardDescription className="text-xs">
                Describe what you ate naturally — our clinical nutrition model will deconstruct ingredients and estimate accurate macros.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {/* Meal Type Selector Buttons */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Select Meal Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { type: "breakfast", label: "Breakfast", icon: Coffee },
                { type: "lunch", label: "Lunch", icon: Sun },
                { type: "dinner", label: "Dinner", icon: Moon },
                { type: "snack", label: "Snack", icon: Cookie },
              ].map((m) => {
                const Icon = m.icon
                const isSelected = selectedMealType === m.type
                return (
                  <button
                    key={m.type}
                    type="button"
                    onClick={() => setSelectedMealType(m.type)}
                    className={cn(
                      "flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-secondary/40 hover:bg-secondary text-muted-foreground border-border"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Meal Description
            </label>
            <Textarea
              placeholder="e.g. 2 whole scrambled eggs on sourdough toast with half an avocado, pinch of sea salt, and black coffee..."
              value={mealInput}
              onChange={(e) => setMealInput(e.target.value)}
              className="text-xs min-h-[90px] resize-none"
            />
          </div>

          {/* Example Chips */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Quick Inspiration
            </span>
            <div className="flex flex-wrap gap-1.5">
              {examplePrompts.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setMealInput(prompt)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border bg-secondary/30 hover:bg-secondary text-muted-foreground text-left transition-colors"
                >
                  "{prompt.slice(0, 38)}..."
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleParseMeal}
              disabled={isParsing || !mealInput.trim()}
              className="gap-2 text-xs font-bold uppercase tracking-wider px-5 h-9"
            >
              <Sparkles className={cn("w-3.5 h-3.5", isParsing && "animate-spin")} />
              {isParsing ? "Extracting Nutrition..." : "Deconstruct & Estimate Macros"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Parsed Result Showcase */}
      {parsedResult && (
        <Card className="border-primary/30 bg-card shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader className="p-5 pb-3 border-b bg-primary/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest mb-1">
                  AI Nutrition Breakdown
                </Badge>
                <CardTitle className="text-lg font-bold tracking-tight capitalize">
                  {selectedMealType} Breakdown
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {parsedResult.summary}
                </CardDescription>
              </div>

              {/* Total Macros Pill */}
              <div className="flex items-center gap-2.5 bg-background p-2.5 rounded-xl border self-start sm:self-auto font-mono text-xs">
                <span className="font-bold text-foreground">{parsedResult.totalCalories} kcal</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-bold text-primary">{Math.round(parsedResult.totalProtein)}g P</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-bold text-amber-500">{Math.round(parsedResult.totalCarbs)}g C</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-bold text-sky-500">{Math.round(parsedResult.totalFats)}g F</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
              <span className="col-span-5 sm:col-span-4">Item</span>
              <span className="col-span-3 sm:col-span-2">Portion</span>
              <span className="col-span-2">Calories</span>
              <span className="col-span-2 hidden sm:block">Protein</span>
              <span className="col-span-2 hidden sm:block text-right">Carbs / Fat</span>
            </div>

            {/* Table Rows */}
            <div className="space-y-2">
              {parsedResult.items.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl border bg-secondary/30 text-xs"
                >
                  <div className="col-span-5 sm:col-span-4">
                    <Input
                      value={item.foodName}
                      onChange={(e) => handleUpdateParsedItem(idx, "foodName", e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>

                  <div className="col-span-3 sm:col-span-2">
                    <Input
                      value={`${item.quantity} ${item.unit || ""}`}
                      onChange={(e) => handleUpdateParsedItem(idx, "unit", e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.calories}
                      onChange={(e) => handleUpdateParsedItem(idx, "calories", parseFloat(e.target.value) || 0)}
                      className="h-7 text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="col-span-2 hidden sm:block font-mono text-primary font-bold">
                    {item.protein}g
                  </div>

                  <div className="col-span-2 hidden sm:block font-mono text-muted-foreground text-right">
                    {item.carbs}g / {item.fats}g
                  </div>
                </div>
              ))}
            </div>

            {/* Commit Button */}
            <div className="pt-3 border-t flex justify-end">
              <Button
                onClick={handleCommitMeals}
                disabled={isSubmitting}
                className="gap-2 text-xs font-bold uppercase tracking-wider h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-4 h-4" />
                {isSubmitting ? "Logging Meals..." : `Confirm & Log to ${selectedMealType}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
