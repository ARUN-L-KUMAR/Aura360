/**
 * Fashion Image Enhance API
 * POST /api/fashion/enhance-image  { imageUrl }
 *
 * Re-renders a raw photo of a garment/accessory as a clean studio product shot
 * using an OpenAI image model, then stores the result on Cloudinary.
 * The original image is never modified or deleted.
 */

import { NextRequest, NextResponse } from "next/server"
import { lookup } from "dns/promises"
import { isIP } from "net"
import { z } from "zod"
import { and, count, eq, gte } from "drizzle-orm"
import { db, aiInteractions } from "@/lib/db"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { uploadImage } from "@/lib/cloudinary"

export const maxDuration = 60

const MODEL = process.env.FASHION_IMAGE_MODEL || "gpt-image-1-mini"
const QUALITY = process.env.FASHION_IMAGE_QUALITY || "low"
const SERVICE = "fashion_image_enhance"

const HOURLY_LIMIT = 10
const DAILY_LIMIT = 30
const MAX_INPUT_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]

const bodySchema = z.object({ imageUrl: z.string().url().max(2048) })

const PROMPT =
  "Turn this photo into a clean studio product photo of the exact same item: centred, front-facing, " +
  "on a pure white background with a soft natural shadow, even lighting, no people, no props, no text overlays. " +
  "Keep the item's colours, shape, logos, prints and details identical to the original. Do not add or invent any details."

// ─── SSRF protection ────────────────────────────────────────────────────────

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase()
    if (v === "::1" || v === "::") return true
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateIp(mapped[1]) : false
  }
  const [a, b] = ip.split(".").map(Number)
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  )
}

async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = new URL(raw)
  if (url.protocol !== "https:") throw new Error("Only https image URLs are supported")
  const host = url.hostname
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (addresses.length === 0 || addresses.some((a) => isPrivateIp(a.address))) {
    throw new Error("That image URL isn't reachable")
  }
  return url
}

async function fetchImage(raw: string): Promise<{ buffer: Buffer; type: string }> {
  let url = await assertPublicHttpsUrl(raw)
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      headers: { "User-Agent": "Aura360/1.0" },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicHttpsUrl(new URL(res.headers.get("location")!, url).toString())
      continue
    }
    if (!res.ok) throw new Error(`Couldn't download the image (${res.status})`)

    const type = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
    if (!ALLOWED_TYPES.includes(type)) throw new Error("Only JPG, PNG or WebP images can be enhanced")

    const length = Number(res.headers.get("content-length") || 0)
    if (length > MAX_INPUT_BYTES) throw new Error("Image is too large (max 8MB)")
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length > MAX_INPUT_BYTES) throw new Error("Image is too large (max 8MB)")
    return { buffer, type }
  }
  throw new Error("Too many redirects")
}

// ─── Rate limiting (reuses the ai_interactions table) ────────────────────────

async function usedSince(userId: string, since: Date): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(aiInteractions)
    .where(
      and(
        eq(aiInteractions.userId, userId),
        eq(aiInteractions.service, SERVICE),
        gte(aiInteractions.createdAt, since)
      )
    )
  return row?.count ?? 0
}

class UserError extends Error {
  constructor(message: string, public status = 400) {
    super(message)
  }
}

export async function POST(request: NextRequest) {
  const started = Date.now()
  let context: Awaited<ReturnType<typeof getWorkspaceContext>> | null = null
  try {
    context = await getWorkspaceContext()

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new UserError("Image enhancement isn't configured on the server", 503)

    const { imageUrl } = bodySchema.parse(await request.json())

    const now = Date.now()
    if ((await usedSince(context.userId, new Date(now - 60 * 60 * 1000))) >= HOURLY_LIMIT) {
      throw new UserError(`Hourly limit reached (${HOURLY_LIMIT} enhancements/hour). Try again later.`, 429)
    }
    if ((await usedSince(context.userId, new Date(now - 24 * 60 * 60 * 1000))) >= DAILY_LIMIT) {
      throw new UserError(`Daily limit reached (${DAILY_LIMIT} enhancements/day).`, 429)
    }

    const { buffer, type } = await fetchImage(imageUrl)

    const form = new FormData()
    form.append("model", MODEL)
    form.append("prompt", PROMPT)
    form.append("size", "1024x1024")
    form.append("quality", QUALITY)
    form.append("image", new Blob([new Uint8Array(buffer)], { type }), `item.${type.split("/")[1]}`)

    const aiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(55_000),
    })
    const aiJson = await aiRes.json().catch(() => ({}))
    const b64: string | undefined = aiJson.data?.[0]?.b64_json
    if (!aiRes.ok || !b64) {
      console.error("[Fashion Enhance] OpenAI error:", aiRes.status, aiJson.error?.message)
      throw new UserError(
        aiRes.status === 400 && /safety|moderation/i.test(aiJson.error?.message || "")
          ? "The AI declined to process this image"
          : "The AI couldn't enhance this image. Please try again.",
        502
      )
    }

    const upload = await uploadImage(`data:image/png;base64,${b64}`, "fashion/enhanced", {
      tags: ["fashion", "enhanced", context.userId],
    })
    if (!upload.success || !upload.url) throw new UserError("Failed to save the enhanced image", 500)

    await db.insert(aiInteractions).values({
      workspaceId: context.workspaceId,
      userId: context.userId,
      service: SERVICE,
      model: MODEL,
      promptTokens: aiJson.usage?.input_tokens ?? 0,
      completionTokens: aiJson.usage?.output_tokens ?? 0,
      totalTokens: aiJson.usage?.total_tokens ?? 0,
      latencyMs: Date.now() - started,
      success: true,
    })

    return NextResponse.json({ url: upload.url, model: MODEL })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "A valid imageUrl is required" }, { status: 400 })
    }
    if (error instanceof UserError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Fashion Enhance] error:", error)
    const message = error instanceof Error ? error.message : "Failed to enhance image"
    const isInput = /image|redirect|reachable|https/i.test(message)
    return NextResponse.json({ error: isInput ? message : "Failed to enhance image" }, { status: isInput ? 400 : 500 })
  }
}
