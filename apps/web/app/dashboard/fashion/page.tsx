import { getAuthSession } from "@/lib/auth-helpers"
import { db, fashionItems } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { FashionClientManager } from "@/components/fashion/fashion-client-manager"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function FashionPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const items = await db
    .select()
    .from(fashionItems)
    .where(
      and(
        eq(fashionItems.workspaceId, user.workspaceId),
        eq(fashionItems.userId, user.id)
      )
    )
    .orderBy(desc(fashionItems.createdAt))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Fashion"
          description="Organize your wardrobe and manage your style"
          iconName="shirt"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        />

        <FashionClientManager initialItems={items as any} />
      </div>
    </div>
  )
}
