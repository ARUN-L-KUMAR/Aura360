"use client"

import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Check, Loader2, Save, Sparkles, Undo2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ComboInput } from "./combo-input"
import { setFashionProfileCache } from "./use-fashion-profile"
import { ProfilePhotoDialog } from "./profile-photo-dialog"
import { ReferencePieces } from "./reference-pieces"
import { COLOR_OPTIONS, sizeOptions } from "@/lib/fashion/field-options"
import {
  BODY_TYPE_OPTIONS,
  EMPTY_PROFILE,
  EYE_COLOR_OPTIONS,
  FACIAL_HAIR_OPTIONS,
  FIT_OPTIONS,
  GENDER_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_TYPE_OPTIONS,
  SKIN_TONES,
  STYLE_OPTIONS,
  UNDERTONE_OPTIONS,
  convertMeasurements,
  type FashionProfileData,
} from "@/lib/fashion/profile"

type NumberKey = "height" | "weight" | "chest" | "waist" | "hips" | "shoulders" | "sleeve" | "inseam" | "neck"
type ListKey = "styleTags" | "favoriteColors" | "avoidColors"

const MEASUREMENTS: Array<{ key: NumberKey; label: string; hint: string }> = [
  { key: "height", label: "Height", hint: "Standing straight, without shoes" },
  { key: "chest", label: "Chest / bust", hint: "Around the fullest part" },
  { key: "waist", label: "Waist", hint: "Around the narrowest part, or where trousers sit" },
  { key: "hips", label: "Hips", hint: "Around the fullest part of the hips" },
  { key: "shoulders", label: "Shoulders", hint: "Across the back, shoulder point to point" },
  { key: "sleeve", label: "Sleeve length", hint: "Shoulder point to wrist" },
  { key: "inseam", label: "Inseam", hint: "Crotch to ankle, inside of the leg" },
  { key: "neck", label: "Neck", hint: "Around the base of the neck" },
]

const SHOE_SIZES: Record<"UK" | "US" | "EU", string[]> = {
  UK: ["4", "5", "5.5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "12", "13"],
  US: ["5", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12", "13", "14"],
  EU: ["37", "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48"],
}

const DRESS_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16", "18"]

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold uppercase tracking-widest">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Badge
          key={option}
          role="button"
          tabIndex={0}
          aria-pressed={selected.includes(option)}
          variant={selected.includes(option) ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onToggle(option)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault()
              onToggle(option)
            }
          }}
        >
          {option}
        </Badge>
      ))}
    </div>
  )
}

/** "My Fit" tab: the user's measurements, sizes, looks and style basics. */
export function FashionProfileView() {
  const [profile, setProfile] = useState<FashionProfileData>(EMPTY_PROFILE)
  const [saved, setSaved] = useState<FashionProfileData>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [loadError, setLoadError] = useState<{ message: string; setup: boolean } | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch("/api/fashion/profile")
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          if (!cancelled) setLoadError({ message: data.error || "Failed to load your profile", setup: Boolean(data.setupRequired) })
          return
        }
        const loaded = { ...EMPTY_PROFILE, ...(data.profile ?? {}) } as FashionProfileData
        if (!cancelled) {
          setProfile(loaded)
          setSaved(loaded)
          setFashionProfileCache(data.profile ? loaded : null)
        }
      } catch {
        if (!cancelled) setLoadError({ message: "Failed to load your profile", setup: false })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dirty = useMemo(() => JSON.stringify(profile) !== JSON.stringify(saved), [profile, saved])
  const set = (changes: Partial<FashionProfileData>) => setProfile((prev) => ({ ...prev, ...changes }))

  const setNumber = (key: NumberKey | "age", raw: string) => {
    const value = raw === "" ? undefined : Number(raw)
    set({ [key]: value !== undefined && Number.isFinite(value) ? value : undefined } as Partial<FashionProfileData>)
  }

  const toggleIn = (key: ListKey, value: string) =>
    setProfile((prev) => {
      const current = prev[key] ?? []
      return { ...prev, [key]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] }
    })

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/fashion/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to save")
      const next = { ...EMPTY_PROFILE, ...(data.profile ?? {}) } as FashionProfileData
      setProfile(next)
      setSaved(next)
      setFashionProfileCache(next)
      toast.success("Your fit profile is saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your profile…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border-2 border-dashed py-14 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <p className="text-sm font-medium">{loadError.message}</p>
        {loadError.setup && (
          <p className="px-6 text-xs text-muted-foreground">
            This is a one-time setup step. Run the command in your project folder, then reload this page.
          </p>
        )}
      </div>
    )
  }

  const unit = profile.unit ?? "cm"
  const shoeSystem = profile.shoeSystem ?? "UK"

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Fit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your measurements, sizes and looks in one place. Everything here is optional and only visible to you.
          </p>
        </div>
        <Button type="button" variant="outline" className="shrink-0 text-xs font-bold uppercase tracking-widest" onClick={() => setPhotoOpen(true)}>
          <Sparkles className="mr-2 h-4 w-4" />
          Fill in from a photo
        </Button>
      </div>

      <ProfilePhotoDialog
        open={photoOpen}
        onOpenChange={setPhotoOpen}
        current={profile}
        onApply={(changes) => set(changes)}
      />

      <ReferencePieces
        profile={profile}
        onChange={(referencePieces) => set({ referencePieces })}
        onUse={(changes) => set(changes)}
      />

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Section title="Basics" description="A few details that help with fit and style suggestions.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender" htmlFor="fit-gender">
              <ComboInput id="fit-gender" placeholder="Pick or type" value={profile.gender ?? ""} onChange={(gender) => set({ gender })} options={GENDER_OPTIONS} />
            </Field>
            <Field label="Age" htmlFor="fit-age">
              <Input id="fit-age" type="number" min={0} max={120} placeholder="e.g., 28" value={profile.age ?? ""} onChange={(e) => setNumber("age", e.target.value)} />
            </Field>
            <Field label="Body type" htmlFor="fit-body">
              <ComboInput id="fit-body" placeholder="Pick or type" value={profile.bodyType ?? ""} onChange={(bodyType) => set({ bodyType })} options={BODY_TYPE_OPTIONS} />
            </Field>
            <Field label="Fit you prefer" htmlFor="fit-pref">
              <ComboInput id="fit-pref" placeholder="Pick or type" value={profile.fitPreference ?? ""} onChange={(fitPreference) => set({ fitPreference })} options={FIT_OPTIONS} />
            </Field>
          </div>
        </Section>

        <Section title="Sizes" description="The sizes you usually wear.">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Tops / shirts" htmlFor="fit-top">
              <ComboInput id="fit-top" placeholder="e.g., M" value={profile.topSize ?? ""} onChange={(topSize) => set({ topSize })} options={sizeOptions("tops")} />
            </Field>
            <Field label="Bottoms / waist" htmlFor="fit-bottom">
              <ComboInput id="fit-bottom" placeholder="e.g., 32" value={profile.bottomSize ?? ""} onChange={(bottomSize) => set({ bottomSize })} options={sizeOptions("bottoms")} />
            </Field>
            <Field label="Dresses" htmlFor="fit-dress">
              <ComboInput id="fit-dress" placeholder="e.g., S" value={profile.dressSize ?? ""} onChange={(dressSize) => set({ dressSize })} options={DRESS_SIZES} />
            </Field>
            <Field label="Shoes" htmlFor="fit-shoe">
              <div className="flex gap-2">
                <div className="inline-flex shrink-0 rounded-lg bg-muted p-1" role="group" aria-label="Shoe size system">
                  {(["UK", "US", "EU"] as const).map((system) => (
                    <button
                      key={system}
                      type="button"
                      aria-pressed={shoeSystem === system}
                      onClick={() => set({ shoeSystem: system })}
                      className={`rounded-md px-2 text-[11px] font-bold transition-colors ${
                        shoeSystem === system ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {system}
                    </button>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <ComboInput id="fit-shoe" placeholder="e.g., 9" value={profile.shoeSize ?? ""} onChange={(shoeSize) => set({ shoeSize })} options={SHOE_SIZES[shoeSystem]} />
                </div>
              </div>
            </Field>
          </div>
          <Field label="Sizing notes" htmlFor="fit-size-notes">
            <Textarea
              id="fit-size-notes"
              rows={2}
              maxLength={500}
              placeholder="e.g., L in Zara, M in H&M, shoes run half a size small"
              value={profile.sizeNotes ?? ""}
              onChange={(e) => set({ sizeNotes: e.target.value })}
            />
          </Field>
        </Section>

        <Section title="Measurements" description="Measure over light clothing or bare. Tap a field for how to measure it.">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Lengths in</span>
            <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Measurement unit">
              {(["cm", "in"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  aria-pressed={unit === u}
                  onClick={() => setProfile((prev) => convertMeasurements(prev, u))}
                  className={`rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    unit === u ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u === "in" ? "inches" : "cm"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {MEASUREMENTS.map(({ key, label, hint }) => (
              <Field key={key} label={`${label} (${unit})`} htmlFor={`fit-${key}`}>
                <Input
                  id={`fit-${key}`}
                  type="number"
                  step="0.1"
                  min={0}
                  placeholder="0"
                  title={hint}
                  value={profile[key] ?? ""}
                  onChange={(e) => setNumber(key, e.target.value)}
                />
              </Field>
            ))}
            <Field label="Weight (kg)" htmlFor="fit-weight">
              <Input id="fit-weight" type="number" step="0.1" min={0} placeholder="0" value={profile.weight ?? ""} onChange={(e) => setNumber("weight", e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Looks" description="Used to suggest colors and styles that suit you.">
          <div className="grid gap-2">
            <Label>Skin tone</Label>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Skin tone">
              {SKIN_TONES.map(({ name, hex }) => {
                const selected = profile.skinTone === name
                return (
                  <button
                    key={name}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={name}
                    title={name}
                    onClick={() => set({ skinTone: selected ? undefined : name })}
                    className="group flex flex-col items-center gap-1"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                        selected ? "border-foreground ring-2 ring-foreground/20" : "border-transparent group-hover:border-muted-foreground/40"
                      }`}
                      style={{ backgroundColor: hex }}
                    >
                      {selected && <Check className="h-4 w-4 text-white mix-blend-difference" />}
                    </span>
                    <span className={`text-[10px] ${selected ? "font-bold" : "text-muted-foreground"}`}>{name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Undertone</Label>
            <ChipGroup
              options={UNDERTONE_OPTIONS}
              selected={profile.undertone ? [profile.undertone] : []}
              onToggle={(value) => set({ undertone: profile.undertone === value ? undefined : value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Hair color" htmlFor="fit-hair-color">
              <ComboInput id="fit-hair-color" placeholder="Pick or type" value={profile.hairColor ?? ""} onChange={(hairColor) => set({ hairColor })} options={HAIR_COLOR_OPTIONS} />
            </Field>
            <Field label="Hair type" htmlFor="fit-hair-type">
              <ComboInput id="fit-hair-type" placeholder="Pick or type" value={profile.hairType ?? ""} onChange={(hairType) => set({ hairType })} options={HAIR_TYPE_OPTIONS} />
            </Field>
            <Field label="Hair length" htmlFor="fit-hair-length">
              <ComboInput id="fit-hair-length" placeholder="Pick or type" value={profile.hairLength ?? ""} onChange={(hairLength) => set({ hairLength })} options={HAIR_LENGTH_OPTIONS} />
            </Field>
            <Field label="Eye color" htmlFor="fit-eye">
              <ComboInput id="fit-eye" placeholder="Pick or type" value={profile.eyeColor ?? ""} onChange={(eyeColor) => set({ eyeColor })} options={EYE_COLOR_OPTIONS} />
            </Field>
            <Field label="Facial hair" htmlFor="fit-facial">
              <ComboInput id="fit-facial" placeholder="Pick or type" value={profile.facialHair ?? ""} onChange={(facialHair) => set({ facialHair })} options={FACIAL_HAIR_OPTIONS} />
            </Field>
          </div>
        </Section>

        <Section title="Style" description="Tap everything that sounds like you.">
          <div className="grid gap-2">
            <Label>Style</Label>
            <ChipGroup options={STYLE_OPTIONS} selected={profile.styleTags ?? []} onToggle={(v) => toggleIn("styleTags", v)} />
          </div>
          <div className="grid gap-2">
            <Label>Favorite colors</Label>
            <ChipGroup options={COLOR_OPTIONS} selected={profile.favoriteColors ?? []} onToggle={(v) => toggleIn("favoriteColors", v)} />
          </div>
          <div className="grid gap-2">
            <Label>Colors you avoid</Label>
            <ChipGroup options={COLOR_OPTIONS} selected={profile.avoidColors ?? []} onToggle={(v) => toggleIn("avoidColors", v)} />
          </div>
        </Section>
      </div>

      {/* Save bar: appears once something changed */}
      {dirty && (
        <div className="sticky bottom-4 z-20 mx-auto flex max-w-xl items-center justify-between gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur">
          <span className="text-xs text-muted-foreground">You have unsaved changes</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setProfile(saved)} disabled={saving}>
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Discard
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700">
              {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
