import { geminiClient } from "@/lib/ai/gemini-client"
import { PHOTO_FIELD_OPTIONS, PHOTO_FIELDS, normalizePhotoAnalysis, type PhotoAnalysis } from "@/lib/fashion/photo-analysis"

const SYSTEM_PROMPT = `You describe the visible appearance of the person in a photo so a clothing app can suggest flattering colors and fits. You are not identifying anyone.

Rules:
- Describe only what is clearly visible. If something is hidden, covered (cap, sunglasses, mask, scarf), too small or too dark to judge, return null for that field.
- Never guess or mention identity, age, gender, ethnicity, nationality, health, or anything else not listed below.
- Skin tone: judge from the face and visible skin, allowing for lighting, filters and shadows. Pick the closest value from the allowed list.
- Use ONLY the allowed values listed for each field, exactly as written.
- "confidence" is "likely" (clearly visible, good light), "possible" (visible but lighting, angle or clothing makes it uncertain) or "unsure" (a guess).
- "build" describes overall body shape from what is visible; loose clothing makes it uncertain.
- If there is no person in the photo, set "personVisible" to false and return empty fields.
- "photoQuality": "good" (clear, well lit), "fair", or "poor" (dark, blurry, heavily filtered, tiny). If fair or poor, put one short tip in "qualityNote" (for example "Try natural daylight and remove filters"); otherwise null.

Return raw JSON only, in exactly this shape:
{
  "personVisible": true,
  "photoQuality": "good" | "fair" | "poor",
  "qualityNote": string | null,
  "fields": {
${PHOTO_FIELDS.map((f) => `    "${f}": { "value": one of ${JSON.stringify(PHOTO_FIELD_OPTIONS[f])}, "confidence": "likely" | "possible" | "unsure" } | null`).join(",\n")}
  }
}`

/**
 * Reads appearance details (skin tone, hair, facial hair, build...) from a photo with Gemini.
 * The image is only held in memory for the request; nothing is stored or logged.
 */
export async function analyzeProfilePhoto(base64Data: string, mimeType: string): Promise<PhotoAnalysis> {
  const { data } = await geminiClient.generateJson<unknown>(
    {
      prompt: "Describe the visible appearance details of the person in this photo, following the rules and JSON shape you were given.",
      systemPrompt: SYSTEM_PROMPT,
      inlineData: { mimeType, data: base64Data },
    },
    {
      model: "gemini-flash-latest",
      config: { temperature: 0.1, timeoutMs: 45_000, maxOutputTokens: 1024 },
    }
  )
  return normalizePhotoAnalysis(data)
}
