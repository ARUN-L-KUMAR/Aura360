import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, ArrowLeft, Sparkles, User, Palette, Shield, Bell, Globe, Moon, Sun } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"

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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/50 dark:to-indigo-900/50 flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your app preferences and account</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Navigation */}
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600" />
                Quick Navigation
              </CardTitle>
              <CardDescription>Jump to different sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                <Link href="/dashboard/profile">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3 bg-transparent hover:bg-muted/50">
                    <User className="w-4 h-4 text-teal-600" />
                    <div className="text-left">
                      <div className="font-medium">Profile</div>
                      <div className="text-xs text-muted-foreground">Update your personal info</div>
                    </div>
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" className="w-full justify-start gap-2 h-auto py-3 bg-transparent hover:bg-muted/50">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <div className="text-left">
                      <div className="font-medium">Dashboard</div>
                      <div className="text-xs text-muted-foreground">Go to your dashboard</div>
                    </div>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Appearance */}
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-purple-600" />
                Appearance
              </CardTitle>
              <CardDescription>Customize how Aura360 looks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Sun className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm">/</span>
                    <Moon className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark mode</p>
                  </div>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Notifications (placeholder for future) */}
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                Notifications
              </CardTitle>
              <CardDescription>Manage notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground p-4 rounded-lg bg-muted/30 text-center">
                Notification settings coming soon
              </p>
            </CardContent>
          </Card>

          {/* About Aura360 */}
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" />
                About Aura360
              </CardTitle>
              <CardDescription>Your personal life management platform</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Aura360 is a comprehensive lifestyle management application that helps you track and organize various
                aspects of your life including notes, finances, fitness, food, fashion, skincare, saved items, and time tracking. 
                All your data is securely stored and accessible only to you.
              </p>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card className="backdrop-blur-sm bg-card/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                Data & Privacy
              </CardTitle>
              <CardDescription>Your data is secure and private</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>All data is encrypted and stored securely with Supabase</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Only you have access to your personal information</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>Row-level security ensures complete data isolation</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2" />
                  <span>You can export or delete your data at any time</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
