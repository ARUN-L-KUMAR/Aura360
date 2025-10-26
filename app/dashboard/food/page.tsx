import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FoodStats } from "@/components/food/food-stats"
import { MealsList } from "@/components/food/meals-list"
import { AddMealButton } from "@/components/food/add-meal-button"
import { UtensilsCrossed } from "lucide-react"

export default async function FoodPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: meals } = await supabase
    .from("food")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
              <UtensilsCrossed className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Food</h1>
              <p className="text-muted-foreground">Track your meals and nutrition</p>
            </div>
          </div>
          <AddMealButton />
        </div>

        <div className="space-y-6">
          <FoodStats meals={meals || []} />
          <MealsList initialMeals={meals || []} />
        </div>
      </div>
    </div>
  )
}
