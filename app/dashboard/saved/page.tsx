import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SavedItemsList } from "@/components/saved/saved-items-list"
import { AddSavedItemButton } from "@/components/saved/add-saved-item-button"
import { Bookmark } from "lucide-react"

export default async function SavedItemsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: items } = await supabase
    .from("saved_items")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Saved Items</h1>
              <p className="text-muted-foreground">Your bookmarked content collection</p>
            </div>
          </div>
          <AddSavedItemButton />
        </div>

        <SavedItemsList initialItems={items || []} />
      </div>
    </div>
  )
}
