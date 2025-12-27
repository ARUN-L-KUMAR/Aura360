import { getAuthSession } from "@/lib/auth-helpers"
import { db, fashionItems } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { DragDropDashboard } from "@/components/fashion/drag-drop-dashboard"
import { FashionTabs } from "@/components/fashion/fashion-tabs"
import { ModuleHeader } from "@/components/ui/module-header"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Grid3X3, List } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Fashion"
          description="Organize your wardrobe and manage your style"
          iconName="shirt"
          iconBgColor="bg-indigo-100 dark:bg-indigo-900/50"
          iconColor="text-indigo-600 dark:text-indigo-400"
        />

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card/80 backdrop-blur-sm mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Drag & Drop Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="tabs" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tabbed View</span>
              <span className="sm:hidden">Tabs</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <DragDropDashboard initialItems={items || []} />
          </TabsContent>

          <TabsContent value="tabs" className="mt-0">
            <FashionTabs initialItems={items || []} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
