import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotesGrid } from "@/components/notes/notes-grid"
import { CreateNoteButton } from "@/components/notes/create-note-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function NotesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: notes } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Notes"
          description="Capture your thoughts and ideas"
          iconName="sticky-note"
          iconBgColor="bg-teal-100 dark:bg-teal-900/50"
          iconColor="text-teal-600 dark:text-teal-400"
        >
          <CreateNoteButton />
        </ModuleHeader>

        <NotesGrid initialNotes={notes || []} />
      </div>
    </div>
  )
}
