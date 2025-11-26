import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TimeLogsList } from "@/components/time/time-logs-list"
import { AddTimeLogButton } from "@/components/time/add-time-log-button"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function TimeLogsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: logs } = await supabase
    .from("time_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Time Logs"
          description="Track how you spend your time"
          iconName="clock"
          iconBgColor="bg-cyan-100 dark:bg-cyan-900/50"
          iconColor="text-cyan-600 dark:text-cyan-400"
        >
          <AddTimeLogButton />
        </ModuleHeader>

        <TimeLogsList initialLogs={logs || []} />
      </div>
    </div>
  )
}
