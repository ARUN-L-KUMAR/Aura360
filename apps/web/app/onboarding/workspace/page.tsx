"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Globe, DollarSign, Loader2, ArrowRight } from "lucide-react"
import { toast } from "sonner"

export default function WorkspaceOnboardingPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const defaultName = session?.user?.name ? `${session.user.name}'s Workspace` : "My Personal LifeSync"

  const [name, setName] = useState(defaultName)
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR")
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata"
    } catch {
      return "Asia/Kolkata"
    }
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Please enter a workspace name")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          currency,
          timezone,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to create workspace")
      }

      toast.success("Workspace created successfully!")

      // Update the NextAuth session so session.user.workspaceId is populated
      await update({ workspaceId: data.workspace.id })

      router.push("/dashboard")
      router.refresh()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to create workspace")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 dark:from-teal-950/40 dark:via-blue-950/40 dark:to-purple-950/40 p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
        <Card className="backdrop-blur-md bg-card/90 border-primary/20 shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-teal-500 via-primary to-purple-500" />
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner">
              <Sparkles className="w-6 h-6" />
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">Set Up Your Workspace</CardTitle>
            <CardDescription className="text-xs font-semibold">
              Create your private, encrypted life management hub to start tracking your finances, fitness, fashion, and routines.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateWorkspace} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="workspace-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Workspace Name
                </Label>
                <Input
                  id="workspace-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arun's Workspace"
                  className="font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    Currency
                  </Label>
                  <Select value={currency} onValueChange={(val: any) => setCurrency(val)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ INR (India)</SelectItem>
                      <SelectItem value="USD">$ USD (US)</SelectItem>
                      <SelectItem value="EUR">€ EUR (Europe)</SelectItem>
                      <SelectItem value="GBP">£ GBP (UK)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    Timezone
                  </Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (AEST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 font-bold uppercase tracking-wider text-xs h-11 bg-gradient-to-r from-teal-600 to-primary hover:from-teal-700 hover:to-primary/90 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Initializing Workspace...
                  </>
                ) : (
                  <>
                    Launch Aura360
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

