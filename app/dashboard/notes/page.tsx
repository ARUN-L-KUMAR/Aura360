import { redirect } from "next/navigation"
import { NotesGrid } from "@/components/notes/notes-grid"
import { CreateNoteButton } from "@/components/notes/create-note-button"
import { ModuleHeader } from "@/components/ui/module-header"
import { getAuthSession } from "@/lib/auth-helpers"
import { db, notes as notesTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"

export default async function NotesPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const notes = await db
    .select()
    .from(notesTable)
    .where(
      and(
        eq(notesTable.workspaceId, user.workspaceId),
        eq(notesTable.userId, user.id)
      )
    )
    .orderBy(desc(notesTable.isPinned), desc(notesTable.updatedAt))

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
