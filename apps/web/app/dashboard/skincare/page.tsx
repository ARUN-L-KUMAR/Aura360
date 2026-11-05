import { getAuthSession } from "@/lib/auth-helpers"
import { db, skincare as skincareTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { SelfCareHub } from "@/components/skincare/self-care-hub"
import { ModuleHeader } from "@/components/ui/module-header"
import { SkincareProduct } from "@/lib/types/skincare"

export default async function SkincarePage() {
  const session = await getAuthSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  const products = (await db
    .select()
    .from(skincareTable)
    .where(
      and(
        eq(skincareTable.workspaceId, user.workspaceId),
        eq(skincareTable.userId, user.id)
      )
    )
    .orderBy(desc(skincareTable.createdAt))) as SkincareProduct[]

  return (
    <div className="min-h-screen bg-background/50">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <div className="mb-10 animate-in slide-in-from-top-4 duration-700">
          <ModuleHeader
            title="Self Care Hub"
            description={`Welcome back, ${user.name?.split(' ')[0] || 'User'}. Ready to start your routine?`}
            iconName="sparkles"
            iconBgColor="bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-900/40 dark:to-rose-800/20"
            iconColor="text-rose-600 dark:text-rose-400"
          />
        </div>

        <SelfCareHub products={products} />
      </div>
    </div>
  )
}
