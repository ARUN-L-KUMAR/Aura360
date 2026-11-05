"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles,
  ChefHat,
  Calendar,
  Clock,
  Check,
  Plus,
  UtensilsCrossed,
  Flame,
  Coffee,
  Sun,
  Moon,
  Cookie,
  ArrowRight,
  TrendingUp,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FoodPlannerTabProps {
  onMealLogged: () => void
}

export function FoodPlannerTab({ onMealLogged }: FoodPlannerTabProps) {
  // Mode: "planner" | "chef"
  const [activeMode, setActiveMode] = useState<"planner" | "chef">("planner")

  // Planner Parameters
  const [framework, setFramework] = useState("High-Protein Athletic")
  const [targetCalories, setTargetCalories] = useState(2200)
  const [targetProtein, setTargetProtein] = useState(165)
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false)
  const [currentPlan, setCurrentPlan] = useState<any>({
    planTitle: "High-Protein Athletic Blueprint",
    targetCalories: 2200,
    targetProtein: 165,
    overview: "Formulated for sustained muscular recovery, glycogen replenishment, and optimal satiety.",
    meals: [
      {
        mealType: "breakfast",
        title: "Protein Power Oatmeal with Blueberries & Almonds",
        prepTime: "10 mins",
        calories: 520,
        protein: 42,
        carbs: 62,
        fats: 12,
        ingredients: ["Rolled oats (70g)", "Whey isolate (30g)", "Fresh blueberries", "Almond butter (15g)"],
        tip: "Stir in whey after cooking oats to preserve protein structure.",
      },
      {
        mealType: "lunch",
        title: "Grilled Chicken & Quinoa Mediterranean Bowl",
        prepTime: "20 mins",
        calories: 650,
        protein: 52,
        carbs: 58,
        fats: 18,
        ingredients: ["Chicken breast (200g)", "Cooked quinoa (150g)", "Cucumbers", "Kalamata olives", "Tzatziki"],
        tip: "Season with oregano and lemon for vibrant Mediterranean flavor.",
      },
      {
        mealType: "dinner",
        title: "Pan-Seared Salmon with Sweet Potato & Asparagus",
        prepTime: "25 mins",
        calories: 680,
        protein: 46,
        carbs: 50,
        fats: 28,
        ingredients: ["Atlantic salmon (200g)", "Baked sweet potato (200g)", "Steamed asparagus (100g)", "Olive oil"],
        tip: "High in omega-3 EPA/DHA to combat workout-induced inflammation.",
      },
      {
        mealType: "snack",
        title: "Greek Yogurt Parfait with Honey & Walnuts",
        prepTime: "5 mins",
        calories: 350,
        protein: 28,
        carbs: 24,
        fats: 14,
        ingredients: ["0% Greek yogurt (200g)", "Raw honey (1 tbsp)", "Crushed walnuts (20g)"],
        tip: "Casein protein provides steady amino acid delivery overnight.",
      },
    ],
  })

  // Chef Studio Parameters
  const [pantryIngredients, setPantryIngredients] = useState("Chicken breast, broccoli, garlic, olive oil, rice, soy sauce")
  const [chefPreference, setChefPreference] = useState("High-Protein & Quick")
  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false)
  const [chefRecipe, setChefRecipe] = useState<any | null>(null)

  // ─── Generate Meal Plan ───────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true)
    try {
      const res = await fetch("/api/food/ai-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_meal_plan",
          params: {
            framework,
            targetCalories,
            targetProtein,
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to generate plan")
      const result = await res.json()

      if (result.success && result.plan) {
        setCurrentPlan(result.plan)
        toast.success(`Generated: "${result.plan.planTitle}"`)
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate meal plan")
    } finally {
      setIsGeneratingPlan(false)
    }
  }

  // ─── Log Planned Meal to Food Log ─────────────────────────────────────────
  const handleLogPlannedMeal = async (meal: any) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          mealType: meal.mealType,
          foodName: meal.title,
          quantity: 1,
          unit: "serving",
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fats: meal.fats,
          notes: `Planned Recipe: ${meal.ingredients?.join(", ")}`,
        }),
      })

      if (!res.ok) throw new Error("Failed to log meal")
      toast.success(`Logged "${meal.title}" to today's ${meal.mealType}!`, { icon: "✅" })
      onMealLogged()
    } catch (err) {
      console.error(err)
      toast.error("Failed to log planned meal")
    }
  }

  // ─── Chef Studio: Generate Recipe ─────────────────────────────────────────
  const handleGenerateChefRecipe = async () => {
    if (!pantryIngredients.trim()) {
      toast.error("Please enter ingredients you have on hand")
      return
    }

    setIsGeneratingRecipe(true)
    try {
      const res = await fetch("/api/food/ai-nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chef_recipe",
          params: {
            ingredients: pantryIngredients.trim(),
            preference: chefPreference,
          },
        }),
      })

      if (!res.ok) throw new Error("Failed to generate recipe")
      const result = await res.json()

      if (result.success && result.recipe) {
        setChefRecipe(result.recipe)
        toast.success(`Recipe Ready: "${result.recipe.recipeTitle}"`, { icon: "👨‍🍳" })
      }
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate recipe")
    } finally {
      setIsGeneratingRecipe(false)
    }
  }

  // Log Chef Recipe
  const handleLogChefRecipe = async () => {
    if (!chefRecipe) return
    try {
      const todayStr = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: todayStr,
          mealType: "dinner",
          foodName: chefRecipe.recipeTitle,
          quantity: 1,
          unit: "serving",
          calories: chefRecipe.calories || 450,
          protein: chefRecipe.protein || 35,
          carbs: chefRecipe.carbs || 25,
          fats: chefRecipe.fats || 15,
          notes: `Chef Recipe: ${chefRecipe.ingredientsList?.join(", ")}`,
        }),
      })

      if (!res.ok) throw new Error("Failed to log recipe")
      toast.success(`Logged "${chefRecipe.recipeTitle}" to dinner!`, { icon: "🍽️" })
      onMealLogged()
    } catch (err) {
      console.error(err)
      toast.error("Failed to log chef recipe")
    }
  }

  return (
    <div className="space-y-6">
      {/* Submode Switcher */}
      <div className="flex bg-secondary/80 p-1 rounded-xl border shadow-sm w-full sm:w-fit">
        <button
          onClick={() => setActiveMode("planner")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
            activeMode === "planner"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Diet Blueprint & Meal Plan</span>
        </button>

        <button
          onClick={() => setActiveMode("chef")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
            activeMode === "chef"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <ChefHat className="w-3.5 h-3.5 text-primary" />
          <span>Cook with What I Have</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODE 1: DIET ARCHITECT & MEAL PLANNER                                */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeMode === "planner" && (
        <div className="space-y-6">
          {/* Generator Controls */}
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">
                    AI Diet Architect & Meal Planner
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Synthesizes balanced 4-meal daily blueprints matching your metabolic goal and protein targets.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 pt-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dietary Framework
                  </label>
                  <select
                    value={framework}
                    onChange={(e) => setFramework(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "High-Protein Athletic",
                      "Lean Fat Loss / Cutting Deficit",
                      "Hypertrophy Surplus / Bulking",
                      "Balanced Mediterranean",
                      "Keto / Low-Carbohydrate",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Daily Calories
                  </label>
                  <Input
                    type="number"
                    value={targetCalories}
                    onChange={(e) => setTargetCalories(parseInt(e.target.value) || 2000)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Target Daily Protein (g)
                  </label>
                  <Input
                    type="number"
                    value={targetProtein}
                    onChange={(e) => setTargetProtein(parseInt(e.target.value) || 150)}
                    className="h-9 text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleGeneratePlan}
                  disabled={isGeneratingPlan}
                  className="gap-2 text-xs font-bold uppercase tracking-wider px-5 h-9"
                >
                  <Sparkles className={cn("w-3.5 h-3.5", isGeneratingPlan && "animate-spin")} />
                  {isGeneratingPlan ? "Architecting Meal Plan..." : "Generate Meal Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Blueprint Header */}
          {currentPlan && (
            <div className="space-y-4">
              <Card className="bg-gradient-to-r from-card via-card to-secondary/30 border-border shadow-sm">
                <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        {currentPlan.targetCalories} kcal
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {currentPlan.targetProtein}g Protein Target
                      </Badge>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight">{currentPlan.planTitle}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {currentPlan.overview}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 4 Meals Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPlan.meals?.map((meal: any, idx: number) => {
                  return (
                    <Card key={idx} className="border-border shadow-sm flex flex-col justify-between">
                      <CardHeader className="p-4 pb-2 border-b bg-muted/20">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge variant="secondary" className="text-[9px] font-bold uppercase tracking-wider mb-1">
                              {meal.mealType} · {meal.prepTime || "15 mins"}
                            </Badge>
                            <CardTitle className="text-base font-bold tracking-tight">
                              {meal.title}
                            </CardTitle>
                          </div>

                          <div className="text-right font-mono shrink-0">
                            <span className="font-bold text-sm text-foreground block">
                              {meal.calories} kcal
                            </span>
                            <span className="text-[11px] font-bold text-primary">
                              {meal.protein}g Protein
                            </span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-3 flex-1 text-xs">
                        {meal.ingredients && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Key Ingredients
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {meal.ingredients.map((ing: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                                  {ing}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {meal.tip && (
                          <div className="p-2 rounded-lg bg-secondary/40 text-[11px] text-muted-foreground leading-relaxed">
                            💡 <span className="font-medium text-foreground">Chef Note:</span> {meal.tip}
                          </div>
                        )}
                      </CardContent>

                      <div className="p-3 border-t bg-muted/10 flex items-center justify-between">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {meal.carbs}g Carbs · {meal.fats}g Fats
                        </span>
                        <Button
                          size="sm"
                          onClick={() => handleLogPlannedMeal(meal)}
                          className="gap-1.5 text-[10px] font-bold uppercase tracking-wider h-8 px-3"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Log Meal
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MODE 2: "COOK WITH WHAT I HAVE" CHEF STUDIO                          */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      {activeMode === "chef" && (
        <div className="space-y-6">
          <Card className="border-border bg-card shadow-sm">
            <CardHeader className="p-5 pb-3 border-b bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <ChefHat className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold tracking-tight">
                    "Cook with What I Have" AI Chef
                  </CardTitle>
                  <CardDescription className="text-xs">
                    List whatever is sitting in your fridge or pantry — our culinary engine will invent a restaurant-caliber, macro-balanced recipe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Available Ingredients in Your Kitchen
                </label>
                <Textarea
                  placeholder="e.g. Chicken breast, broccoli, eggs, garlic, olive oil, jasmine rice, soy sauce..."
                  value={pantryIngredients}
                  onChange={(e) => setPantryIngredients(e.target.value)}
                  className="text-xs min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Culinary Preference
                  </label>
                  <select
                    value={chefPreference}
                    onChange={(e) => setChefPreference(e.target.value)}
                    className="w-full bg-background border rounded-lg px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-primary outline-none"
                  >
                    {[
                      "High-Protein & Quick (<20 mins)",
                      "Low-Calorie / Volume Eating",
                      "Low-Carbohydrate & Keto",
                      "Comfort Food Made Healthy",
                      "One-Pan / Minimal Cleanup",
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleGenerateChefRecipe}
                  disabled={isGeneratingRecipe || !pantryIngredients.trim()}
                  className="gap-2 text-xs font-bold uppercase tracking-wider px-5 h-9"
                >
                  <Sparkles className={cn("w-3.5 h-3.5", isGeneratingRecipe && "animate-spin")} />
                  {isGeneratingRecipe ? "Inventing Recipe..." : "Generate Gourmet Recipe"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated Chef Recipe Card */}
          {chefRecipe && (
            <Card className="border-primary/30 bg-card shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300">
              <CardHeader className="p-5 pb-3 border-b bg-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest mb-1">
                      Chef's Special Creation
                    </Badge>
                    <CardTitle className="text-xl font-bold tracking-tight">
                      {chefRecipe.recipeTitle}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Prep: {chefRecipe.prepTime} · Cook: {chefRecipe.cookTime} · Difficulty: {chefRecipe.difficulty || "Easy"}
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2.5 bg-background p-2.5 rounded-xl border self-start sm:self-auto font-mono text-xs">
                    <span className="font-bold text-foreground">{chefRecipe.calories} kcal</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-bold text-primary">{chefRecipe.protein}g Protein</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-bold text-amber-500">{chefRecipe.carbs}g Carbs</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="font-bold text-sky-500">{chefRecipe.fats}g Fat</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                {/* Ingredients List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Required Ingredients
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {chefRecipe.ingredientsList?.map((ing: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs font-medium">
                        {ing}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Cooking Instructions
                  </span>
                  <ol className="space-y-2 text-xs text-foreground/90 pl-4 list-decimal leading-relaxed">
                    {chefRecipe.instructions?.map((step: string, i: number) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                {/* Chef Secret Technique */}
                {chefRecipe.chefTip && (
                  <div className="p-3 rounded-xl bg-secondary/50 border text-xs text-muted-foreground leading-relaxed">
                    👨‍🍳 <span className="font-bold text-foreground">Chef's Secret Technique:</span> {chefRecipe.chefTip}
                  </div>
                )}

                <div className="pt-3 border-t flex justify-end">
                  <Button
                    onClick={handleLogChefRecipe}
                    className="gap-2 text-xs font-bold uppercase tracking-wider h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Check className="w-4 h-4" />
                    Cooked This & Log to Dinner
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
