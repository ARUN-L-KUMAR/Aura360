import { getAuthSession } from "@/lib/auth-helpers"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { User, ArrowLeft, Sparkles } from "lucide-react"
import Link from "next/link"

export default async function ProfilePage() {
  const session = await getAuthSession()
  const user = session.user

  if (!user) {
    redirect("/auth/login")
  }

  const [profile] = await db.select().from(users).where(eq(users.id, user.id))

  // Transform to match ProfileForm expectations
  const profileData = profile ? {
    id: profile.id,
    email: profile.email,
    fullName: profile.name,
    avatarUrl: profile.image,
    createdAt: profile.createdAt?.toISOString(),
    updatedAt: profile.updatedAt?.toISOString(),
  } : null

  const userData = {
    id: user.id,
    email: user.email,
    createdAt: profile?.createdAt,
    updatedAt: profile?.updatedAt,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-4xl p-4 sm:p-6 md:p-10">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent hidden sm:inline">
              Aura360
            </span>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/50 dark:to-blue-900/50 flex items-center justify-center">
            <User className="w-6 h-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Profile</h1>
            <p className="text-muted-foreground">Manage your personal information and account settings</p>
          </div>
        </div>

        <ProfileForm user={userData} profile={profileData} />
      </div>
    </div>
  )
}
