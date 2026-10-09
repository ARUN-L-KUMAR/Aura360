import { z } from "zod"
import { and, eq, sql } from "drizzle-orm"
import { db, fashionItems } from "@/lib/db"
import { auditCreate } from "@/lib/audit"
import { uploadImage } from "@/lib/cloudinary"
import { ProductScrapeError, scrapeProduct } from "@/lib/services/product-scraper"
import { loadFashionProfile } from "@/lib/fashion/profile-server"
import { sizeAvailability } from "@/lib/fashion/size-match"
import { productMetadata } from "@/lib/fashion/product-import"
import { cacheProduct, getCachedProduct } from "@/lib/fashion/product-link-cache"
import type { ScrapedProduct } from "@/lib/types/fashion"
import type { AiTool } from "./types"

const MAX_PHOTOS = 5

const sizesOf = (product: ScrapedProduct): string[] =>
  Array.isArray(product.size) ? product.size : product.size ? [product.size] : []

const num = (value?: string) => {
  const n = value ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

/** Reads the link (reusing a product read a moment ago in the same chat). */
async function loadProduct(url: string): Promise<ScrapedProduct> {
  const cached = getCachedProduct(url)
  if (cached) return cached
  const product = await scrapeProduct(url)
  cacheProduct(url, product)
  return product
}

export const getProductFromLink: AiTool = {
  name: "get_product_from_link",
  description:
    "Read a shopping link (Amazon, Flipkart, Myntra, Ajio, Meesho) and return the product's real name, brand, category, price, MRP, colors, available sizes and rating, plus whether the user's saved size is available. Call this FIRST whenever the user pastes a product link, and never guess product details from the link text.",
  parameters: z.object({
    url: z.string().url().describe("The product link the user pasted"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    try {
      const product = await loadProduct(args.url)
      const sizes = sizesOf(product)
      const availability = sizeAvailability(await loadFashionProfile(ctx), product.category, sizes)

      return {
        success: true,
        name: product.product_name,
        brand: product.brand || null,
        category: product.category,
        price: num(product.price.current) ?? null,
        mrp: num(product.price.original) ?? null,
        discount: product.price.discount ?? null,
        color: product.color || null,
        colors: product.colors ?? [],
        availableSizes: sizes,
        rating: product.rating ?? null,
        photos: product.images.length,
        store: product.platform,
        yourSize: availability.mySize,
        yourSizeAvailable: availability.status === "available" ? true : availability.status === "unavailable" ? false : null,
      }
    } catch (error) {
      if (error instanceof ProductScrapeError) return { success: false, error: error.message }
      console.error("[AI get_product_from_link] error:", error instanceof Error ? error.message : error)
      return { success: false, error: "Couldn't read that link." }
    }
  },
}

export const addFashionItemFromLink: AiTool = {
  name: "add_fashion_item_from_link",
  description:
    "Add the product from a shopping link to the user's wardrobe (they own it) or wishlist (they want to buy it). Saves the real name, brand, price, photos, colors, sizes and the buying link. Call get_product_from_link first. Use status \"wishlist\" unless the user says they already own or bought it.",
  parameters: z.object({
    url: z.string().url().describe("The product link"),
    status: z.enum(["wardrobe", "wishlist"]).default("wishlist").describe("wardrobe = already owned, wishlist = want to buy"),
    size: z.string().optional().describe("The user's own size, only if they said it (for example M or 32)"),
    notes: z.string().optional().describe("Notes the user wants saved with the item"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    let product: ScrapedProduct
    try {
      product = await loadProduct(args.url)
    } catch (error) {
      if (error instanceof ProductScrapeError) return { success: false, error: error.message }
      console.error("[AI add_fashion_item_from_link] error:", error instanceof Error ? error.message : error)
      return { success: false, error: "Couldn't read that link." }
    }

    // Don't add the same product twice
    const [existing] = await db
      .select({ id: fashionItems.id, name: fashionItems.name, status: fashionItems.status })
      .from(fashionItems)
      .where(
        and(
          eq(fashionItems.workspaceId, ctx.workspaceId),
          eq(fashionItems.userId, ctx.userId),
          sql`${fashionItems.metadata}->>'buyingLink' = ${product.buying_link}`
        )
      )
      .limit(1)
    if (existing) {
      return { success: false, alreadyAdded: true, name: existing.name, status: existing.status }
    }

    // Copy the photos to our own storage so they keep working; fall back to the shop's link if that fails
    const photos = await Promise.all(
      product.images.slice(0, MAX_PHOTOS).map(async (url) => {
        const uploaded = await uploadImage(url, "fashion", { tags: ["fashion", "chat-import", ctx.userId] }).catch(() => null)
        return uploaded?.success && uploaded.url ? uploaded.url : url
      })
    )
    const [imageUrl, ...extraImages] = photos

    const [row] = await db
      .insert(fashionItems)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        name: product.product_name,
        status: args.status,
        category: product.category || "general",
        brand: product.brand || undefined,
        color: product.color || undefined,
        size: args.size || undefined,
        price: product.price.current || undefined,
        imageUrl,
        images: extraImages.length ? extraImages : undefined,
        notes: args.notes || product.description || undefined,
        condition: args.status === "wardrobe" ? "good" : undefined,
        metadata: { ...productMetadata(product), buyingLink: product.buying_link },
      })
      .returning()

    await auditCreate(ctx, "fashion_items", row.id, row, { source: "ai_agent" })

    const availability = sizeAvailability(await loadFashionProfile(ctx), product.category, sizesOf(product))
    return {
      success: true,
      item: { id: row.id, name: row.name, status: row.status, brand: row.brand, price: row.price },
      photosSaved: photos.length,
      yourSize: availability.mySize,
      yourSizeAvailable: availability.status === "available" ? true : availability.status === "unavailable" ? false : null,
      availableSizes: sizesOf(product),
    }
  },
}
