import { redirect } from "next/navigation"
import { NotesClientManager } from "@/components/notes/notes-client-manager"
import { ModuleHeader } from "@/components/ui/module-header"
import { getAuthSession } from "@/lib/auth-helpers"
import { db, notes as notesTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"

export default async function NotesPage() {
  const session = await getAuthSession()
  const user = session?.user

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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-10 pb-24 md:pb-10 space-y-8">
        <NotesClientManager initialNotes={(notes as any) || []} />
      </div>
    </div>
  )
}
