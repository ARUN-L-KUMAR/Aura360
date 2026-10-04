"use client"

import React from "react"
import { GenerativeWorkoutWidget } from "./workout-widget"
import { GenerativeMealWidget } from "./meal-widget"
import { FinanceWidget, FinanceWidgetData } from "./finance-widget"
import { FashionWidget, FashionWidgetData } from "./fashion-widget"

interface GenerativeWidgetRouterProps {
  raw: string
  lang?: string
}

export function canRenderWidget(raw: string, lang?: string): boolean {
  if (!raw) return false
  const trimmed = raw.trim()
  if (!((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]")))) {
    return false
  }
  try {
    const parsed = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== "object") return false
    const widgetType = (parsed.widget || parsed.type || lang?.replace(/^widget:/, "") || "").toLowerCase()
    return Boolean(
      widgetType === "workout" ||
      widgetType === "fitness" ||
      widgetType === "meal" ||
      widgetType === "food" ||
      widgetType === "nutrition" ||
      widgetType === "finance" ||
      widgetType === "budget" ||
      widgetType === "fashion" ||
      widgetType === "outfit" ||
      widgetType === "style" ||
      (Array.isArray(parsed.exercises) && parsed.exercises.length > 0) ||
      (parsed.calories !== undefined && parsed.macros !== undefined) ||
      (parsed.totalIncome !== undefined && Array.isArray(parsed.categories)) ||
      (Array.isArray(parsed.items) && (parsed.vibe || parsed.palette))
    )
  } catch {
    return false
  }
}

export function GenerativeWidgetRouter({ raw, lang }: GenerativeWidgetRouterProps) {
  // 1. Check if language matches explicit widget tag
  const isWidgetLang = lang?.startsWith("widget:") || lang === "widget"
  const widgetTypeFromLang = lang?.replace(/^widget:/, "").toLowerCase()

  // 2. Try parsing the raw text as JSON
  let parsed: any = null
  try {
    const trimmed = raw.trim()
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      parsed = JSON.parse(trimmed)
    }
  } catch {
    // Not valid JSON
    return null
  }

  if (!parsed || typeof parsed !== "object") {
    return null
  }

  // Determine widget type from parsed object or language
  const widgetType = (parsed.widget || parsed.type || widgetTypeFromLang || "").toLowerCase()

  // ROUTE 1: Workout Routine
  if (
    widgetType === "workout" ||
    widgetType === "fitness" ||
    (Array.isArray(parsed.exercises) && parsed.exercises.length > 0)
  ) {
    const durationNum = typeof parsed.duration === "number" ? parsed.duration : parseInt(String(parsed.duration || "45")) || 45
    return (
      <GenerativeWorkoutWidget
        data={{
          title: parsed.title || "Target Routine",
          focus: parsed.difficulty || (Array.isArray(parsed.targetMuscles) ? parsed.targetMuscles.join(", ") : "Strength & Hypertrophy"),
          durationMinutes: durationNum,
          estimatedCalories: parsed.estimatedCalories || 320,
          exercises: (parsed.exercises || []).map((ex: any) => ({
            name: ex.name || "Exercise",
            sets: ex.sets || 3,
            reps: ex.reps || "10",
            notes: ex.weight ? `${ex.weight}` : undefined
          }))
        }}
      />
    )
  }

  // ROUTE 2: Meal / Recipe / Nutrition
  if (
    widgetType === "meal" ||
    widgetType === "food" ||
    widgetType === "nutrition" ||
    (parsed.calories !== undefined && parsed.macros !== undefined) ||
    (Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0) ||
    (Array.isArray(parsed.items) && parsed.calories !== undefined)
  ) {
    const caloriesNum = Number(parsed.calories) || 520
    const proteinNum = Number(parsed.macros?.protein ?? parsed.protein ?? 35)
    const carbsNum = Number(parsed.macros?.carbs ?? parsed.carbs ?? 55)
    const fatsNum = Number(parsed.macros?.fats ?? parsed.fats ?? 14)

    const items = Array.isArray(parsed.items)
      ? parsed.items
      : Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((ing: any) => ({
          name: typeof ing === "string" ? ing : ing.name || "Ingredient",
          portion: typeof ing === "object" ? ing.portion : undefined
        }))
      : []

    return (
      <GenerativeMealWidget
        data={{
          mealTitle: parsed.name || parsed.title || "Curated Nutrition Fuel",
          mealType: parsed.mealType || "lunch",
          calories: caloriesNum,
          protein: proteinNum,
          carbs: carbsNum,
          fats: fatsNum,
          items: items.length > 0 ? items : undefined
        }}
      />
    )
  }

  // ROUTE 3: Finance Budget Allocation
  if (
    widgetType === "finance" ||
    widgetType === "budget" ||
    (parsed.totalIncome !== undefined && Array.isArray(parsed.categories))
  ) {
    const financeData: FinanceWidgetData = {
      title: parsed.title || "Dynamic Budget Blueprint",
      totalIncome: Number(parsed.totalIncome) || 4000,
      currency: parsed.currency || "$",
      categories: parsed.categories || [],
      advice: parsed.advice || parsed.notes
    }
    return <FinanceWidget data={financeData} />
  }

  // ROUTE 4: Fashion / Outfit Capsule
  if (
    widgetType === "fashion" ||
    widgetType === "outfit" ||
    widgetType === "style" ||
    (Array.isArray(parsed.items) && (parsed.vibe || parsed.palette))
  ) {
    const fashionData: FashionWidgetData = {
      title: parsed.title || "AI Capsule Ensemble",
      vibe: parsed.vibe || "Modern Minimalist",
      occasion: parsed.occasion || "Daily Smart Casual",
      weatherMatch: parsed.weatherMatch || parsed.weather,
      harmonyScore: Number(parsed.harmonyScore) || 94,
      palette: parsed.palette || [],
      items: parsed.items || [],
      stylingTip: parsed.stylingTip || parsed.tip
    }
    return <FashionWidget data={fashionData} />
  }

  // If none matched, return null to fall back to standard code block
  return null
}
