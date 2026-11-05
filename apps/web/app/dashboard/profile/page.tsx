import { getAuthSession } from "@/lib/auth-helpers"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/profile/profile-form"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function ProfilePage() {
  const session = await getAuthSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  const [profile] = await db.select().from(users).where(eq(users.id, user.id))

  // Transform to match ProfileForm expectations
  const profileData = profile ? {
    id: profile.id,
    email: profile.email as string,
    fullName: profile.name,
    avatarUrl: profile.image,
    coverImage: profile.coverImage,
    createdAt: profile.createdAt?.toISOString() || "",
    updatedAt: profile.updatedAt?.toISOString() || "",
  } : null

  const userData = {
    id: user.id,
    email: user.email || null,
    createdAt: profile?.createdAt || undefined,
    updatedAt: profile?.updatedAt || undefined,
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl p-6 sm:p-10 pb-24 md:pb-10 space-y-10">
        <ModuleHeader
          title="Identity"
          description="Manage your biological and digital presence"
          iconName="user"
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          <ProfileForm user={userData} profile={profileData} />
        </div>
      </div>
    </div>
  )
}
