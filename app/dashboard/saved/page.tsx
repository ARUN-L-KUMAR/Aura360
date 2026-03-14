import { getAuthSession } from "@/lib/auth-helpers"
import { db, savedItems } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { SavedItemsList } from "@/components/saved/saved-items-list"
import { AddSavedItemButton } from "@/components/saved/add-saved-item-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function SavedItemsPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const items = await db
    .select()
    .from(savedItems)
    .where(
      and(
        eq(savedItems.workspaceId, user.workspaceId),
        eq(savedItems.userId, user.id)
      )
    )
    .orderBy(desc(savedItems.createdAt))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Saved Items"
          description="Your bookmarked content collection"
          iconName="bookmark"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        >
          <AddSavedItemButton />
        </ModuleHeader>

        <SavedItemsList initialItems={items as any || []} />
      </div>
    </div>
  )
}
