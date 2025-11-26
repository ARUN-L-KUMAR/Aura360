import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FitnessStats } from "@/components/fitness/fitness-stats"
import { FitnessLog } from "@/components/fitness/fitness-log"
import { AddFitnessButton } from "@/components/fitness/add-fitness-button"
import { ModuleHeader } from "@/components/ui/module-header"

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
      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        <ModuleHeader
          title="Fitness"
          description="Track your workouts and progress"
          iconName="dumbbell"
          iconBgColor="bg-purple-100 dark:bg-purple-900/50"
          iconColor="text-purple-600 dark:text-purple-400"
        >
          <AddFitnessButton />
        </ModuleHeader>

        <div className="space-y-6">
          <FitnessStats fitnessData={fitnessData || []} />
          <FitnessLog initialData={fitnessData || []} />
        </div>
      </div>
    </div>
  )
}
