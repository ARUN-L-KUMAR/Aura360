import { z } from "zod"

/** Shape of a user's saved fashion profile (stored as JSON in fashion_profiles.data). Every field is optional. */

const text = (max = 60) => z.string().trim().max(max).optional()
const measurement = z.number().min(0).max(400).nullable().optional()
const tags = z.array(z.string().trim().min(1).max(40)).max(20).optional()

const readingSchema = z.object({
  key: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(60),
  cm: z.number().min(0).max(400),
})

/** A garment the user owns that fits them well, with the size they wear and that size's measurements. */
export const referencePieceSchema = z.object({
  id: z.string().min(1).max(60),
  name: z.string().trim().min(1).max(160),
  brand: text(80),
  category: text(60),
  imageUrl: z.string().max(600).optional(),
  link: z.string().max(1000).optional(),
  platform: text(30),
  size: z.string().trim().min(1).max(20),
  body: z.array(readingSchema).max(12),
  garment: z.array(readingSchema).max(12),
  addedAt: z.string().max(40).optional(),
})
export type ReferencePiece = z.infer<typeof referencePieceSchema>

export const fashionProfileSchema = z.object({
  // Basics
  gender: text(),
  age: z.number().int().min(0).max(120).nullable().optional(),
  bodyType: text(),
  fitPreference: text(),

  // Measurements (lengths in `unit`, weight always in kg)
  unit: z.enum(["cm", "in"]).optional(),
  height: measurement,
  weight: measurement,
  chest: measurement,
  waist: measurement,
  hips: measurement,
  shoulders: measurement,
  sleeve: measurement,
  inseam: measurement,
  neck: measurement,

  // Sizes
  topSize: text(20),
  bottomSize: text(20),
  dressSize: text(20),
  shoeSystem: z.enum(["UK", "US", "EU"]).optional(),
  shoeSize: text(10),
  sizeNotes: text(500),

  // Looks
  skinTone: text(30),
  undertone: text(20),
  hairColor: text(40),
  hairType: text(30),
  hairLength: text(30),
  eyeColor: text(30),
  facialHair: text(30),

  // Pieces that fit well (measurements come from their size charts)
  referencePieces: z.array(referencePieceSchema).max(12).optional(),

  // Style
  styleTags: tags,
  favoriteColors: tags,
  avoidColors: tags,
})

export type FashionProfileData = z.infer<typeof fashionProfileSchema>

export const EMPTY_PROFILE: FashionProfileData = { unit: "cm", shoeSystem: "UK" }

export const GENDER_OPTIONS = ["Male", "Female", "Non-binary", "Prefer not to say"]
export const BODY_TYPE_OPTIONS = ["Slim", "Athletic", "Average", "Broad", "Curvy", "Plus size"]
export const FIT_OPTIONS = ["Slim fit", "Regular fit", "Relaxed fit", "Oversized"]
export const UNDERTONE_OPTIONS = ["Warm", "Cool", "Neutral", "Not sure"]
export const HAIR_COLOR_OPTIONS = ["Black", "Dark brown", "Brown", "Light brown", "Blonde", "Red", "Auburn", "Grey", "White", "Dyed"]
export const HAIR_TYPE_OPTIONS = ["Straight", "Wavy", "Curly", "Coily"]
export const HAIR_LENGTH_OPTIONS = ["Bald / shaved", "Short", "Medium", "Long"]
export const EYE_COLOR_OPTIONS = ["Black", "Dark brown", "Brown", "Hazel", "Green", "Blue", "Grey"]
export const FACIAL_HAIR_OPTIONS = ["Clean shaven", "Stubble", "Short beard", "Full beard", "Moustache"]
export const STYLE_OPTIONS = ["Casual", "Streetwear", "Formal", "Smart casual", "Minimal", "Sporty", "Ethnic", "Vintage", "Korean", "Boho"]

export const SKIN_TONES: Array<{ name: string; hex: string }> = [
  { name: "Fair", hex: "#F6D7C3" },
  { name: "Light", hex: "#EBC4A5" },
  { name: "Medium", hex: "#D9A27A" },
  { name: "Olive", hex: "#C08E5E" },
  { name: "Tan", hex: "#A56E45" },
  { name: "Brown", hex: "#7A4B2C" },
  { name: "Deep", hex: "#4A2C1A" },
]

const CM_PER_INCH = 2.54
const LENGTH_KEYS = ["height", "chest", "waist", "hips", "shoulders", "sleeve", "inseam", "neck"] as const

/** Converts the length measurements when the user switches between cm and inches (weight stays in kg). */
export function convertMeasurements(profile: FashionProfileData, to: "cm" | "in"): FashionProfileData {
  const from = profile.unit ?? "cm"
  if (from === to) return profile
  const next: FashionProfileData = { ...profile, unit: to }
  for (const key of LENGTH_KEYS) {
    const value = profile[key]
    if (typeof value === "number") {
      const converted = to === "in" ? value / CM_PER_INCH : value * CM_PER_INCH
      next[key] = Math.round(converted * 10) / 10
    }
  }
  return next
}

// ── Prompt helpers (used by the AI Designer and Ask Aura) ─────────────────────

const oneLine = (value: unknown) => String(value).replace(/\s+/g, " ").trim()

/** Plain-text summary of the profile for an AI prompt. Returns "" when nothing has been filled in. */
export function describeFashionProfile(profile: FashionProfileData | null | undefined): string {
  if (!profile) return ""
  const unit = profile.unit ?? "cm"
  const lines: string[] = []
  const join = (parts: Array<string | undefined | false>) => parts.filter(Boolean).join(", ")

  const basics = join([
    profile.gender && oneLine(profile.gender),
    typeof profile.age === "number" && `${profile.age} years old`,
    profile.bodyType && `${oneLine(profile.bodyType)} build`,
    profile.fitPreference && `prefers ${oneLine(profile.fitPreference).toLowerCase()}`,
  ])
  if (basics) lines.push(`- Basics: ${basics}`)

  const sizes = join([
    profile.topSize && `tops ${oneLine(profile.topSize)}`,
    profile.bottomSize && `bottoms ${oneLine(profile.bottomSize)}`,
    profile.dressSize && `dresses ${oneLine(profile.dressSize)}`,
    profile.shoeSize && `shoes ${profile.shoeSystem ?? "UK"} ${oneLine(profile.shoeSize)}`,
  ])
  if (sizes) lines.push(`- Sizes: ${sizes}${profile.sizeNotes ? ` (note: ${oneLine(profile.sizeNotes)})` : ""}`)

  const measured = LENGTH_KEYS.filter((k) => typeof profile[k] === "number").map((k) => `${k} ${profile[k]}`)
  if (typeof profile.weight === "number") measured.push(`weight ${profile.weight}kg`)
  if (measured.length) lines.push(`- Measurements (${unit}): ${measured.join(", ")}`)

  if (profile.referencePieces?.length) {
    const cm = (r: { label: string; cm: number }) => `${r.label.toLowerCase()} ${r.cm}cm`
    const pieces = profile.referencePieces.slice(0, 5).map((p) => {
      const readings = [...p.body.map((r) => `body ${cm(r)}`), ...p.garment.map((r) => `garment ${cm(r)}`)]
      return `${oneLine(p.brand && !p.name.toLowerCase().startsWith(p.brand.toLowerCase()) ? `${p.brand} ${p.name}` : p.name).slice(0, 80)} in size ${oneLine(p.size)}${readings.length ? ` (${readings.join(", ")})` : ""}`
    })
    lines.push(`- Pieces that fit them well: ${pieces.join("; ")}`)
  }

  const looks = join([
    profile.skinTone && `skin tone ${oneLine(profile.skinTone)}${profile.undertone ? ` (${oneLine(profile.undertone).toLowerCase()} undertone)` : ""}`,
    profile.hairColor && `${oneLine(profile.hairColor)} hair${profile.hairLength ? `, ${oneLine(profile.hairLength).toLowerCase()}` : ""}${profile.hairType ? `, ${oneLine(profile.hairType).toLowerCase()}` : ""}`,
    profile.eyeColor && `${oneLine(profile.eyeColor)} eyes`,
    profile.facialHair && oneLine(profile.facialHair).toLowerCase(),
  ])
  if (looks) lines.push(`- Looks: ${looks}`)

  const style: string[] = []
  if (profile.styleTags?.length) style.push(`style ${profile.styleTags.map(oneLine).join(", ")}`)
  if (profile.favoriteColors?.length) style.push(`favorite colors ${profile.favoriteColors.map(oneLine).join(", ")}`)
  if (profile.avoidColors?.length) style.push(`AVOIDS colors ${profile.avoidColors.map(oneLine).join(", ")}`)
  if (style.length) lines.push(`- Style: ${style.join("; ")}`)

  return lines.length ? lines.join("\n") : ""
}

/** Rules telling the model how to use the profile; only added when a profile exists. */
export const PROFILE_STYLING_RULES = `PERSONALISATION RULES (apply to every suggestion):
- Choose colors that flatter the user's skin tone and undertone (warm: earthy olive, camel, cream, rust; cool: navy, emerald, charcoal, crisp white; neutral: most palettes work).
- Prefer the user's favorite colors, and never use colors they avoid.
- Respect their preferred fit, and use their measurements and build for proportions (for example height and inseam for trouser length and rise, shoulders and chest for jackets).
- Keep to their style tags. Mention their size when relevant.
- Briefly say how a suggestion suits them (colors, fit or proportions), without repeating their personal measurements back.`

/** Profile block + rules, ready to drop into a prompt ("" when the user has no profile). */
export function profilePromptBlock(profile: FashionProfileData | null | undefined): string {
  const description = describeFashionProfile(profile)
  if (!description) return ""
  return `\nABOUT THE USER (their saved fit profile):\n${description}\n\n${PROFILE_STYLING_RULES}\n`
}
