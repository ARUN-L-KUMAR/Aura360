import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TimeLogsList } from "@/components/time/time-logs-list"
import { AddTimeLogButton } from "@/components/time/add-time-log-button"
import { Clock } from "lucide-react"

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
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 flex items-center justify-center">
              <Clock className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Time Logs</h1>
              <p className="text-muted-foreground">Track how you spend your time</p>
            </div>
          </div>
          <AddTimeLogButton />
        </div>

        <TimeLogsList initialLogs={logs || []} />
      </div>
    </div>
  )
}
