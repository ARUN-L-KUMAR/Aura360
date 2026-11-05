import { getAuthSession } from "@/lib/auth-helpers"
import { db, fitness as fitnessTable } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { FitnessClientManager } from "@/components/fitness/fitness-client-manager"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function FitnessPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const fitnessData = await db
    .select()
    .from(fitnessTable)
    .where(
      and(
        eq(fitnessTable.workspaceId, user.workspaceId),
        eq(fitnessTable.userId, user.id)
      )
    )
    .orderBy(desc(fitnessTable.date))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Fitness"
          description="Your adaptive strength, periodization, and recovery operating system"
          iconName="dumbbell"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        />

        <div className="mt-6">
          <FitnessClientManager initialData={(fitnessData || []) as any} />
        </div>
      </div>
    </div>
  )
}
