import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auditCreate } from "@/lib/audit"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, fashionItems, notes, savedItems } from "@/lib/db"
import {
  ingestLink,
  type IngestLinkResult,
  type IngestionType,
  type SuggestedModule,
} from "@/lib/services/link-ingestion"

const ingestRequestSchema = z.object({
  url: z.string().url(),
  destination: z.enum(["auto", "fashion", "notes", "saved", "food", "fitness"]).optional(),
  autoSave: z.boolean().optional().default(false),
  forceRefresh: z.boolean().optional().default(false),
})

function mapToSavedType(type: IngestionType): "article" | "video" | "product" | "recipe" | "other" {
  if (type === "article") return "article"
  if (type === "video") return "video"
  if (type === "product") return "product"
  return "other"
}

function resolveDestination(
  requestedDestination: "auto" | SuggestedModule | undefined,
  suggestedModule: SuggestedModule
): SuggestedModule {
  if (!requestedDestination || requestedDestination === "auto") {
    return suggestedModule
  }

  return requestedDestination
}

function deriveFashionCategory(ingested: IngestLinkResult): string {
  const haystack = `${ingested.title} ${ingested.description ?? ""}`.toLowerCase()

  if (/shoe|sneaker|heel|loafer|boot/.test(haystack)) return "shoes"
  if (/shirt|t-shirt|tee|top|blouse/.test(haystack)) return "tops"
  if (/jeans|pant|trouser|skirt|shorts/.test(haystack)) return "bottoms"
  if (/bag|handbag|backpack|wallet|belt/.test(haystack)) return "accessories"

  return "general"
}

async function persistToDestination(input: {
  destination: SuggestedModule
  ingested: IngestLinkResult
  context: { workspaceId: string; userId: string }
}) {
  const { destination, ingested, context } = input

  if (destination === "notes") {
    const content = [ingested.description, "", ingested.url].filter(Boolean).join("\n")

    const [note] = await db
      .insert(notes)
      .values({
        ...context,
        title: ingested.title,
        content,
        category: "link",
        metadata: {
          source: ingested.source,
          type: ingested.type,
          ingestedLinkId: ingested.id,
          imageUrl: ingested.image,
        },
      })
      .returning()

    await auditCreate(context, "note", note.id, note)

    return {
      module: "notes" as const,
      id: note.id,
      record: note,
    }
  }

  if (destination === "fashion") {
    const extraction = (ingested.metadata?.extraction as Record<string, unknown> | undefined) ?? {}
    const rawPrice = extraction.price

    let numericPrice: number | undefined
    if (typeof rawPrice === "string") {
      const match = rawPrice.match(/[\d,.]+/)
      if (match) {
        const normalized = match[0].replace(/,/g, "")
        const parsed = Number.parseFloat(normalized)
        if (!Number.isNaN(parsed)) {
          numericPrice = parsed
        }
      }
    }

    const [item] = await db
      .insert(fashionItems)
      .values({
        ...context,
        name: ingested.title,
        description: ingested.description,
        category: deriveFashionCategory(ingested),
        imageUrl: ingested.image,
        status: "wishlist",
        price: numericPrice?.toString(),
        metadata: {
          buyingLink: ingested.url,
          source: ingested.source,
          ingestedLinkId: ingested.id,
        },
      })
      .returning()

    await auditCreate(context, "fashion_item", item.id, item)

    return {
      module: "fashion" as const,
      id: item.id,
      record: item,
    }
  }

  const [saved] = await db
    .insert(savedItems)
    .values({
      ...context,
      type: mapToSavedType(ingested.type),
      title: ingested.title,
      url: ingested.url,
      description: ingested.description,
      imageUrl: ingested.image,
      metadata: {
        source: ingested.source,
        type: ingested.type,
        ingestedLinkId: ingested.id,
      },
    })
    .returning()

  await auditCreate(context, "saved_item", saved.id, saved)

  return {
    module: "saved" as const,
    id: saved.id,
    record: saved,
  }
}

/**
 * POST /api/ingest-link
 *
 * Request:
 * {
 *   "url": "https://...",
 *   "destination": "auto" | "fashion" | "notes" | "saved" | "food" | "fitness",
 *   "autoSave": boolean,
 *   "forceRefresh": boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const context = await getWorkspaceContext()
    const body = await request.json()
    const parsed = ingestRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid input",
          details: parsed.error.errors,
        },
        { status: 400 }
      )
    }

    const data = parsed.data

    const ingested = await ingestLink({
      context,
      url: data.url,
      forceRefresh: data.forceRefresh,
    })

    const destination = resolveDestination(data.destination, ingested.suggestedModule)

    let saveResult: Awaited<ReturnType<typeof persistToDestination>> | null = null
    if (data.autoSave) {
      const supportedDestination: SuggestedModule =
        destination === "food" || destination === "fitness" ? "saved" : destination

      saveResult = await persistToDestination({
        destination: supportedDestination,
        ingested,
        context,
      })
    }

    return NextResponse.json({
      ...ingested,
      requestedDestination: data.destination ?? "auto",
      resolvedDestination: destination,
      persistedTo: saveResult?.module ?? null,
      persistedRecordId: saveResult?.id ?? null,
    })
  } catch (error) {
    console.error("[Ingest Link API] POST error:", error)

    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: "Failed to ingest link",
      },
      { status: 500 }
    )
  }
}
