import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { User } from "lucide-react"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Profile</h1>
            <p className="text-muted-foreground">Manage your personal information</p>
          </div>
        </div>

        <ProfileForm user={user} profile={profile} />
      </div>
    </div>
  )
}
