/**
 * POST /api/fashion/profile/analyze-photo  { image: "data:image/jpeg;base64,..." }
 *
 * Reads skin tone, hair, facial hair, build etc. from a photo of the user and returns suggestions with a
 * confidence level for each. The photo is processed in memory only: it is never stored or logged, and
 * nothing is saved to the profile here (the user reviews and applies the suggestions in the UI).
 */

import { NextRequest, NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { analyzeProfilePhoto } from "@/lib/ai/services/profile-photo-analyzer"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 4 * 1024 * 1024

// Basic per-user throttle (in memory: it resets when the server restarts, which is fine as a cost guard)
const WINDOW_MS = 60 * 60 * 1000
const MAX_PER_WINDOW = 10
const recent = new Map<string, number[]>()

function throttled(userId: string): boolean {
  const now = Date.now()
  const hits = (recent.get(userId) ?? []).filter((t) => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(userId, hits)
    return true
  }
  recent.set(userId, [...hits, now])
  return false
}

export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()

    const body = await request.json().catch(() => null)
    const match = typeof body?.image === "string" ? body.image.match(/^data:(image\/[a-z]+);base64,([A-Za-z0-9+/=]+)$/) : null
    if (!match) {
      return NextResponse.json({ error: "Send the photo as a base64 image (JPEG, PNG or WebP)" }, { status: 400 })
    }

    const [, mimeType, base64] = match
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json({ error: "Only JPEG, PNG or WebP photos are supported" }, { status: 400 })
    }
    if (Math.floor((base64.length * 3) / 4) > MAX_BYTES) {
      return NextResponse.json({ error: "That photo is too large. Try a smaller one." }, { status: 413 })
    }

    if (throttled(context.userId)) {
      return NextResponse.json({ error: "You've analyzed a few photos already. Please try again in a while." }, { status: 429 })
    }

    const analysis = await analyzeProfilePhoto(base64, mimeType)
    return NextResponse.json({ analysis })
  } catch (error) {
    // Deliberately not logging the request body: it contains the photo
    console.error("[Profile Photo API] error:", error instanceof Error ? error.message : "unknown error")
    return NextResponse.json({ error: "Couldn't analyze the photo. Please try again." }, { status: 502 })
  }
}
