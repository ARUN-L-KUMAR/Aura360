import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-4xl p-6 md:p-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your app preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
              <CardDescription>Navigate to different settings sections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/profile">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Profile Settings
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle>About LifeSync</CardTitle>
              <CardDescription>Your personal life management platform</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                LifeSync is a comprehensive lifestyle management application that helps you track and organize various
                aspects of your life including notes, finances, fitness, food, fashion, and skincare routines. All your
                data is securely stored and accessible only to you.
              </p>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Your data is secure and private</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• All data is encrypted and stored securely</li>
                <li>• Only you have access to your personal information</li>
                <li>• Row-level security ensures data isolation</li>
                <li>• You can export or delete your data at any time</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
