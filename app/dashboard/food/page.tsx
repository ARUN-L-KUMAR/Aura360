import { getAuthSession } from "@/lib/auth-helpers"
import { db, food as foodTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { FoodClientManager } from "@/components/food/food-client-manager"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function FoodPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const meals = await db
    .select()
    .from(foodTable)
    .where(
      and(
        eq(foodTable.workspaceId, user.workspaceId),
        eq(foodTable.userId, user.id)
      )
    )
    .orderBy(desc(foodTable.date))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Food"
          description="Your adaptive nutrition, macro architecture, and culinary studio"
          iconName="utensils-crossed"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        />

        <div className="mt-6">
          <FoodClientManager initialMeals={meals || []} />
        </div>
      </div>
    </div>
  )
}
