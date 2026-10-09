import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { ProductScrapeError, scrapeProduct } from "@/lib/services/product-scraper"

export const runtime = "nodejs"
export const maxDuration = 60

const requestSchema = z.object({ url: z.string().url() })

/**
 * POST /api/scrape-product  { url }
 *
 * Fetches a product page (Amazon, Flipkart, Myntra, Meesho, Ajio) and returns its name, brand,
 * price, photos and description. Photos are returned as the shop's own links; the app copies the
 * ones the user keeps to Cloudinary when the item is saved.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid product URL is required" }, { status: 400 })
  }

  try {
    const product = await scrapeProduct(parsed.data.url)

    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof ProductScrapeError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[Scrape Product API] error:", error)
    return NextResponse.json({ error: "Failed to fetch product details" }, { status: 500 })
  }
}
