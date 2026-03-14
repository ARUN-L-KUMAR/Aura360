import { getAuthSession } from "@/lib/auth-helpers"
import { db, skincare as skincareTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { SkincareRoutine } from "@/components/skincare/skincare-routine"
import { ProductsList } from "@/components/skincare/products-list"
import { AddProductButton } from "@/components/skincare/add-product-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function SkincarePage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const products = await db
    .select()
    .from(skincareTable)
    .where(
      and(
        eq(skincareTable.workspaceId, user.workspaceId),
        eq(skincareTable.userId, user.id)
      )
    )
    .orderBy(desc(skincareTable.createdAt))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Skincare"
          description="Track your skincare routine and products"
          iconName="sparkles"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        >
          <AddProductButton />
        </ModuleHeader>

        <div className="space-y-6">
          <SkincareRoutine products={products as any || []} />
          <ProductsList initialProducts={products as any || []} />
        </div>
      </div>
    </div>
  )
}
