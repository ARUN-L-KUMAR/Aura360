import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DragDropDashboard } from "@/components/fashion/drag-drop-dashboard"
import { FashionTabs } from "@/components/fashion/fashion-tabs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shirt, Grid3X3, List } from "lucide-react"

export default async function FashionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: items } = await supabase
    .from("fashion")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
              <Shirt className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Fashion</h1>
              <p className="text-muted-foreground">Organize your wardrobe, manage your wishlist, and experiment with outfits</p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-card/80 backdrop-blur-sm mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              Drag & Drop Dashboard
            </TabsTrigger>
            <TabsTrigger value="tabs" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Tabbed View
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
