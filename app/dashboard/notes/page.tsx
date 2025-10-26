import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { NotesGrid } from "@/components/notes/notes-grid"
import { CreateNoteButton } from "@/components/notes/create-note-button"
import { StickyNote } from "lucide-react"

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
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
              <StickyNote className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Notes</h1>
              <p className="text-muted-foreground">Capture your thoughts and ideas</p>
            </div>
          </div>
          <CreateNoteButton />
        </div>

        <NotesGrid initialNotes={notes || []} />
      </div>
    </div>
  )
}
