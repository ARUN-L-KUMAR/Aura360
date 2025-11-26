import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FoodStats } from "@/components/food/food-stats"
import { MealsList } from "@/components/food/meals-list"
import { AddMealButton } from "@/components/food/add-meal-button"
import { ModuleHeader } from "@/components/ui/module-header"

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
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Food"
          description="Track your meals and nutrition"
          iconName="utensils-crossed"
          iconBgColor="bg-orange-100 dark:bg-orange-900/50"
          iconColor="text-orange-600 dark:text-orange-400"
        >
          <AddMealButton />
        </ModuleHeader>

        <div className="space-y-6">
          <FoodStats meals={meals || []} />
          <MealsList initialMeals={meals || []} />
        </div>
      </div>
    </div>
  )
}
