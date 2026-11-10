import {
  BODY_TYPE_OPTIONS,
  EYE_COLOR_OPTIONS,
  FACIAL_HAIR_OPTIONS,
  HAIR_COLOR_OPTIONS,
  HAIR_LENGTH_OPTIONS,
  HAIR_TYPE_OPTIONS,
  SKIN_TONES,
} from "@/lib/fashion/profile"

/** Shared by the photo-analysis API and the review dialog. */

export type Confidence = "likely" | "possible" | "unsure"

export const PHOTO_FIELDS = ["skinTone", "undertone", "bodyType", "hairColor", "hairType", "hairLength", "facialHair", "eyeColor"] as const
export type PhotoField = (typeof PHOTO_FIELDS)[number]

export const PHOTO_FIELD_LABELS: Record<PhotoField, string> = {
  skinTone: "Skin tone",
  undertone: "Undertone",
  bodyType: "Build",
  hairColor: "Hair color",
  hairType: "Hair type",
  hairLength: "Hair length",
  facialHair: "Facial hair",
  eyeColor: "Eye color",
}

/** The only values the analysis may return for each field (matches the My Fit choices). */
export const PHOTO_FIELD_OPTIONS: Record<PhotoField, string[]> = {
  skinTone: SKIN_TONES.map((t) => t.name),
  undertone: ["Warm", "Cool", "Neutral"],
  bodyType: BODY_TYPE_OPTIONS,
  hairColor: HAIR_COLOR_OPTIONS,
  hairType: HAIR_TYPE_OPTIONS,
  hairLength: HAIR_LENGTH_OPTIONS,
  facialHair: FACIAL_HAIR_OPTIONS,
  eyeColor: EYE_COLOR_OPTIONS,
}

/** Things a photo can't settle, so they never read as more than "possible" however sure the model sounds. */
const CONFIDENCE_CEILING: Partial<Record<PhotoField, Confidence>> = {
  undertone: "possible", // hard to judge even in person, and lighting changes it
  bodyType: "possible", // loose clothes and posture hide it
  eyeColor: "possible", // too small to read unless it's a close-up
}

const RANK: Record<Confidence, number> = { unsure: 0, possible: 1, likely: 2 }
const capAt = (value: Confidence, ceiling: Confidence): Confidence => (RANK[value] > RANK[ceiling] ? ceiling : value)

export interface PhotoSuggestion {
  value: string
  confidence: Confidence
}

export interface PhotoAnalysis {
  personVisible: boolean
  quality: "good" | "fair" | "poor"
  qualityNote: string | null
  suggestions: Partial<Record<PhotoField, PhotoSuggestion>>
}

const isConfidence = (v: unknown): v is Confidence => v === "likely" || v === "possible" || v === "unsure"

/** Turns the model's JSON into something safe to show: only known values, confidence capped where a photo can't be sure. */
export function normalizePhotoAnalysis(raw: unknown): PhotoAnalysis {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>
  const quality = data.photoQuality === "good" || data.photoQuality === "fair" || data.photoQuality === "poor" ? data.photoQuality : "fair"
  const personVisible = data.personVisible !== false
  const note = typeof data.qualityNote === "string" && data.qualityNote.trim() ? data.qualityNote.trim().slice(0, 200) : null

  const suggestions: PhotoAnalysis["suggestions"] = {}
  if (personVisible) {
    const fields = (data.fields && typeof data.fields === "object" ? data.fields : {}) as Record<string, any>
    for (const field of PHOTO_FIELDS) {
      const entry = fields[field]
      if (!entry || typeof entry !== "object" || typeof entry.value !== "string") continue

      const value = PHOTO_FIELD_OPTIONS[field].find((o) => o.toLowerCase() === entry.value.trim().toLowerCase())
      if (!value) continue // not one of our allowed values

      let confidence: Confidence = isConfidence(entry.confidence) ? entry.confidence : "unsure"
      if (quality === "poor") confidence = capAt(confidence, "possible")
      const ceiling = CONFIDENCE_CEILING[field]
      if (ceiling) confidence = capAt(confidence, ceiling)

      suggestions[field] = { value, confidence }
    }
  }

  return { personVisible, quality, qualityNote: note, suggestions }
}
