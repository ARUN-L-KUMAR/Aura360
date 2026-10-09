"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Bell, Loader2, Save, Send, Smartphone, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ComboInput } from "@/components/fashion/combo-input"
import { DEFAULT_PREFS, type NotificationPrefs } from "@/lib/notifications/prefs-schema"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function timezoneOptions(): string[] {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone")
    if (list?.length) return list
  } catch {
    // older browsers: fall through to a short list
  }
  return ["Asia/Kolkata", "UTC", "Asia/Dubai", "Asia/Singapore", "Europe/London", "America/New_York", "America/Los_Angeles", "Australia/Sydney"]
}

function Row({ title, hint, checked, onChange, disabled, children }: { title: string; hint?: string; checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; children?: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border bg-secondary/20 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-sm font-bold">{title}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} aria-label={title} />
      </div>
      {checked && children && <div className="grid gap-3 border-t pt-3">{children}</div>}
    </div>
  )
}

function TimeField({ label, value, onChange, optional }: { label: string; value: string | null; onChange: (v: string | null) => void; optional?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type="time" value={value ?? ""} onChange={(e) => onChange(e.target.value || (optional ? null : value))} className="w-36" />
    </div>
  )
}

/** Settings > Notifications: which reminders and alerts to get, when, and how (in-app, email, phone push). */
export function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [saved, setSaved] = useState<NotificationPrefs>(DEFAULT_PREFS)
  const [devices, setDevices] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const zones = useMemo(timezoneOptions, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch("/api/notifications/preferences")
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.error || "Failed to load")
        if (cancelled) return
        setPrefs(data.prefs)
        setSaved(data.prefs)
        setDevices(data.devices ?? 0)

        // First visit: offer the browser's timezone instead of the default (saved only when the user saves)
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (browserZone && JSON.stringify(data.prefs) === JSON.stringify(DEFAULT_PREFS)) {
          setPrefs({ ...data.prefs, timezone: browserZone })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved)
  const patch = <K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) => setPrefs((p) => ({ ...p, [key]: value }))
  const patchIn = <K extends "quietHours" | "budget" | "subscriptions" | "workout" | "meals" | "skincare" | "fashion">(key: K, changes: Partial<NotificationPrefs[K]>) =>
    setPrefs((p) => ({ ...p, [key]: { ...p[key], ...changes } }))

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/notifications/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(prefs) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to save")
      setPrefs(data.prefs)
      setSaved(data.prefs)
      toast.success("Notification settings saved")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setTesting(true)
    try {
      const response = await fetch("/api/notifications/test", { method: "POST" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Test failed")
      const r = data.result
      const parts = ["in-app ✓"]
      if (prefs.email !== saved.email || prefs.push !== saved.push) parts.push("(save first to test newly switched channels)")
      if (r?.email && r.email !== "skipped") parts.push(r.email.ok ? "email ✓" : `email ✗ ${r.email.error ?? ""}`)
      if (r?.push && r.push !== "skipped") parts.push(r.push.ok ? `push ✓ (${r.push.devices})` : `push ✗ ${r.push.error ?? ""}`)
      toast.success(`Sent: ${parts.join(", ")}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed")
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm">
        <CardContent className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading notification settings…
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{error}</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="backdrop-blur-sm bg-card/50 border-border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
          <Bell className="h-4 w-4 text-orange-600" /> Notifications
        </CardTitle>
        <CardDescription className="text-xs font-semibold">Choose what you hear about, when, and where.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Channels */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Row title="In-app" hint="The bell. Always on." checked disabled />
          <Row title="Email" hint="To your account email." checked={prefs.email} onChange={(v) => patch("email", v)} />
          <Row
            title="Phone push"
            hint={devices > 0 ? `${devices} phone${devices === 1 ? "" : "s"} connected` : "Needs the Aura360 mobile app"}
            checked={prefs.push}
            onChange={(v) => patch("push", v)}
          />
        </div>
        {prefs.push && devices === 0 && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            No phone is registered yet. Open the Aura360 mobile app and allow notifications; it will show up here.
          </p>
        )}

        {/* Timezone and quiet hours */}
        <div className="grid gap-4 rounded-xl border bg-secondary/20 p-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Your timezone</Label>
            <ComboInput value={prefs.timezone} onChange={(v) => patch("timezone", v)} options={zones} placeholder="e.g., Asia/Kolkata" />
            <p className="text-[11px] text-muted-foreground">Reminder times below follow this clock.</p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Quiet hours</Label>
              <Switch checked={prefs.quietHours.enabled} onCheckedChange={(v) => patchIn("quietHours", { enabled: v })} aria-label="Quiet hours" />
            </div>
            {prefs.quietHours.enabled ? (
              <div className="flex items-center gap-2">
                <Input type="time" className="w-32" value={prefs.quietHours.start} onChange={(e) => e.target.value && patchIn("quietHours", { start: e.target.value })} />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="time" className="w-32" value={prefs.quietHours.end} onChange={(e) => e.target.value && patchIn("quietHours", { end: e.target.value })} />
              </div>
            ) : null}
            <p className="text-[11px] text-muted-foreground">No email or phone alerts then. They still appear in the bell.</p>
          </div>
        </div>

        {/* Alerts */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Row title="Budget alerts" hint="When a category reaches its alert level or goes over." checked={prefs.budget.enabled} onChange={(v) => patchIn("budget", { enabled: v })} />
          <Row title="Subscription renewals" hint="Before a subscription is charged (uses each one's reminder days)." checked={prefs.subscriptions.enabled} onChange={(v) => patchIn("subscriptions", { enabled: v })} />
        </div>

        {/* Reminders */}
        <Row title="Workout reminder" hint="A nudge on the days you choose." checked={prefs.workout.enabled} onChange={(v) => patchIn("workout", { enabled: v })}>
          <TimeField label="At" value={prefs.workout.time} onChange={(v) => v && patchIn("workout", { time: v })} />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Days">
            {DAYS.map((day, i) => {
              const on = prefs.workout.days.includes(i)
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patchIn("workout", { days: on ? prefs.workout.days.filter((d) => d !== i) : [...prefs.workout.days, i].sort() })}
                  className={`h-8 w-11 rounded-md border text-xs font-bold ${on ? "border-foreground bg-foreground text-background" : "text-muted-foreground hover:border-foreground/40"}`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={prefs.workout.onlyIfNotLogged} onCheckedChange={(v) => patchIn("workout", { onlyIfNotLogged: v })} />
            Skip it if I already logged a workout today
          </label>
        </Row>

        <Row title="Meal reminders" hint="Leave a time empty to skip that meal." checked={prefs.meals.enabled} onChange={(v) => patchIn("meals", { enabled: v })}>
          <div className="flex flex-wrap gap-4">
            <TimeField label="Breakfast" value={prefs.meals.breakfast} optional onChange={(v) => patchIn("meals", { breakfast: v })} />
            <TimeField label="Lunch" value={prefs.meals.lunch} optional onChange={(v) => patchIn("meals", { lunch: v })} />
            <TimeField label="Dinner" value={prefs.meals.dinner} optional onChange={(v) => patchIn("meals", { dinner: v })} />
          </div>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={prefs.meals.onlyIfNotLogged} onCheckedChange={(v) => patchIn("meals", { onlyIfNotLogged: v })} />
            Skip a meal I already logged
          </label>
        </Row>

        <Row title="Skincare routine" hint="Lists the products in that routine." checked={prefs.skincare.enabled} onChange={(v) => patchIn("skincare", { enabled: v })}>
          <div className="flex flex-wrap gap-4">
            <TimeField label="Morning" value={prefs.skincare.morning} optional onChange={(v) => patchIn("skincare", { morning: v })} />
            <TimeField label="Evening" value={prefs.skincare.evening} optional onChange={(v) => patchIn("skincare", { evening: v })} />
          </div>
        </Row>

        <Row title="Unworn clothes" hint="A weekly nudge about wardrobe pieces you haven't worn." checked={prefs.fashion.enabled} onChange={(v) => patchIn("fashion", { enabled: v })}>
          <div className="flex flex-wrap items-end gap-4">
            <div className="grid gap-1.5">
              <Label className="text-xs">Unworn for (days)</Label>
              <Input type="number" min={14} max={365} className="w-28" value={prefs.fashion.unwornDays} onChange={(e) => patchIn("fashion", { unwornDays: Math.min(365, Math.max(14, Number(e.target.value) || 60)) })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">On</Label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={prefs.fashion.weekday}
                onChange={(e) => patchIn("fashion", { weekday: Number(e.target.value) })}
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <TimeField label="At" value={prefs.fashion.time} onChange={(v) => v && patchIn("fashion", { time: v })} />
          </div>
        </Row>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={sendTest} disabled={testing || saving}>
            {testing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
            Send a test
          </Button>
          <div className="flex items-center gap-2">
            {dirty && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setPrefs(saved)} disabled={saving}>
                <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Discard
              </Button>
            )}
            <Button type="button" size="sm" onClick={save} disabled={!dirty || saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
