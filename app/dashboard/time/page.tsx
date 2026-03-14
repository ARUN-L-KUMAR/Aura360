import { getAuthSession } from "@/lib/auth-helpers"
import { db, timeLogs } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { redirect } from "next/navigation"
import { TimeLogsList } from "@/components/time/time-logs-list"
import { AddTimeLogButton } from "@/components/time/add-time-log-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function TimeLogsPage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const logs = await db
    .select()
    .from(timeLogs)
    .where(
      and(
        eq(timeLogs.workspaceId, user.workspaceId),
        eq(timeLogs.userId, user.id)
      )
    )
    .orderBy(desc(timeLogs.date))

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Time Logs"
          description="Track how you spend your time"
          iconName="clock"
          iconBgColor="bg-secondary"
          iconColor="text-slate-600 dark:text-slate-400"
        >
          <AddTimeLogButton />
        </ModuleHeader>

        <TimeLogsList initialLogs={logs || []} />
      </div>
    </div>
  )
}
