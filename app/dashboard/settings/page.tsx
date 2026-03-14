import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, User, Palette, Shield, Bell, Moon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { ModuleHeader } from "@/components/ui/module-header"

export default async function SettingsPage() {
  const session = await getAuthSession()
  const user = session?.user

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl p-6 sm:p-10 pb-24 md:pb-10 space-y-10">
        <ModuleHeader
          title="Terminal Settings"
          description="Configure your environment and personal parameters"
          iconName="settings"
          iconBgColor="bg-primary/10"
          iconColor="text-primary"
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Left: Quick Actions & Personal */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm overflow-hidden">
              <div className="h-2 bg-primary/20" />
              <CardHeader>
                <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  Quick Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/dashboard/profile" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 transition-all">
                    <User className="w-4 h-4" />
                    Modify Bio
                  </Button>
                </Link>
                <Link href="/dashboard" className="block">
                  <Button variant="ghost" className="w-full justify-start gap-3 font-bold text-xs uppercase tracking-widest hover:bg-primary/5 transition-all">
                    <Sparkles className="w-4 h-4" />
                    Control Center
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm overflow-hidden">
               <div className="h-2 bg-blue-500/20" />
               <CardHeader>
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                     <Shield className="w-4 h-4 text-blue-500" />
                     Data Security
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {[
                     "Encrypted Cloud Storage",
                     "Private Access Protocols",
                     "Biometric Integration",
                     "Data Portability"
                  ].map((item) => (
                     <div key={item} className="flex items-center gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item}</span>
                     </div>
                  ))}
               </CardContent>
            </Card>
          </div>

          {/* Right: Main Preference Panels */}
          <div className="lg:col-span-2 space-y-6">
            {/* Appearance Panel */}
            <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm transition-all hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-600" />
                    Interface
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold">Customize your visual telemetry</CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center border shadow-sm">
                       <Moon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">Dark Mode Activation</p>
                      <p className="text-[10px] font-bold text-muted-foreground/60">Toggle between light and dark photons</p>
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              </CardContent>
            </Card>

            {/* Notifications Panel */}
            <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm transition-all hover:border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                 <div className="space-y-1">
                  <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Bell className="w-4 h-4 text-orange-600" />
                    Signals
                  </CardTitle>
                  <CardDescription className="text-xs font-semibold">Manage system alerts and broadcasts</CardDescription>
                </div>
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-orange-600 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                   <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col justify-between h-24">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Email Uplink</p>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold py-1 px-2 bg-emerald-500/10 text-emerald-600 rounded">ACTIVE</span>
                         <span className="text-[10px] font-bold text-muted-foreground/40">v2.1</span>
                      </div>
                   </div>
                   <div className="p-4 rounded-xl bg-secondary/30 border border-border flex flex-col justify-between h-24 opacity-60 grayscale cursor-not-allowed">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Push Frequency</p>
                      <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold py-1 px-2 bg-secondary text-muted-foreground rounded">STABLE</span>
                         <span className="text-[10px] font-bold text-muted-foreground/40">BETA</span>
                      </div>
                   </div>
                </div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
                   <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-primary/70">
                      System Note: Direct signal routing is currently optimized for primary email relays. Real-time push protocols are in development.
                   </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
