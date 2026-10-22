import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auditCreate } from "@/lib/audit"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, fashionItems, notes, savedItems } from "@/lib/db"
import {
  ingestLink,
  type IngestedProduct,
  type IngestLinkResult,
  type IngestionType,
  type SuggestedModule,
} from "@/lib/services/link-ingestion"
import { classifyProduct, type ProductClassification } from "@/lib/services/product-category"

export const runtime = "nodejs"
// Reading a shop page can take a while when the shop is slow or the renderer has to be asked.
export const maxDuration = 60

const ingestRequestSchema = z.object({
  url: z.string().url(),
  destination: z.enum(["auto", "fashion", "notes", "saved", "food", "fitness", "skincare", "time"]).optional(),
  autoSave: z.boolean().optional().default(false),
  forceRefresh: z.boolean().optional().default(false),
  /** What the app was shared with next to the link; used as the name when the shop blocks the read. */
  hintTitle: z.string().trim().max(300).optional(),
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

function productOf(ingested: IngestLinkResult): IngestedProduct | null {
  return (ingested.metadata?.product as IngestedProduct | undefined) ?? null
}

/** Where a shopping link belongs and what it is called. Links read before this existed are classified now. */
function classificationOf(ingested: IngestLinkResult): ProductClassification | null {
  if (ingested.source !== "ecommerce") return null
  const stored = ingested.metadata?.classification as ProductClassification | undefined
  if (stored?.module) return stored
  return classifyProduct({ title: ingested.title, description: ingested.description, scrapedCategory: productOf(ingested)?.scrapedCategory })
}

function priceOf(ingested: IngestLinkResult): number | undefined {
  const raw = productOf(ingested)?.price ?? (ingested.metadata?.extraction as Record<string, unknown> | undefined)?.price
  if (typeof raw !== "string") return undefined
  const match = raw.match(/[\d,.]+/)
  const parsed = match ? Number.parseFloat(match[0].replace(/,/g, "")) : Number.NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
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
    const product = productOf(ingested)
    const classification = classificationOf(ingested)
    const numericPrice = priceOf(ingested)
    const category =
      classification?.module === "fashion" && classification.category !== "general"
        ? classification.category
        : deriveFashionCategory(ingested)

    const [item] = await db
      .insert(fashionItems)
      .values({
        ...context,
        name: ingested.title,
        description: ingested.description,
        category,
        brand: product?.brand ?? undefined,
        color: product?.color ?? undefined,
        imageUrl: ingested.image,
        status: "wishlist",
        price: numericPrice?.toString(),
        metadata: {
          buyingLink: ingested.url,
          source: ingested.source,
          ingestedLinkId: ingested.id,
          ...(product ? { store: product.store, originalPrice: product.originalPrice, currency: product.currency } : {}),
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

  // A shopping link saved here gets a product category (Electronics, Appliances, ...), kept as a tag so it can be searched.
  const product = productOf(ingested)
  const classification = classificationOf(ingested)
  const category = classification ? (classification.module === "saved" ? classification.category : "Fashion") : null
  const price = priceOf(ingested)

  const [saved] = await db
    .insert(savedItems)
    .values({
      ...context,
      type: mapToSavedType(ingested.type),
      title: ingested.title,
      url: ingested.url,
      description: ingested.description,
      imageUrl: ingested.image,
      tags: category ? [category] : undefined,
      metadata: {
        source: ingested.source,
        type: ingested.type,
        ingestedLinkId: ingested.id,
        ...(category ? { category } : {}),
        ...(price !== undefined ? { price, currency: product?.currency ?? "INR" } : {}),
        ...(product ? { store: product.store, brand: product.brand } : {}),
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
      hintTitle: data.hintTitle,
    })

    const destination = resolveDestination(data.destination, ingested.suggestedModule)

    let saveResult: Awaited<ReturnType<typeof persistToDestination>> | null = null
    if (data.autoSave) {
      const supportedDestination: SuggestedModule =
        destination === "food" || destination === "fitness" || destination === "skincare" || destination === "time"
          ? "saved"
          : destination

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
