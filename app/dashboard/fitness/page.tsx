import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FitnessStats } from "@/components/fitness/fitness-stats"
import { FitnessLog } from "@/components/fitness/fitness-log"
import { AddFitnessButton } from "@/components/fitness/add-fitness-button"
import { Dumbbell } from "lucide-react"

export default async function FitnessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: fitnessData } = await supabase
    .from("fitness")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground">Fitness</h1>
              <p className="text-muted-foreground">Track your workouts and progress</p>
            </div>
          </div>
          <AddFitnessButton />
        </div>

        <div className="space-y-6">
          <FitnessStats fitnessData={fitnessData || []} />
          <FitnessLog initialData={fitnessData || []} />
        </div>
      </div>
    </div>
  )
}
