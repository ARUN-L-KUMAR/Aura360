import { z } from "zod"
import { and, eq, sql } from "drizzle-orm"
import { db, fashionItems, savedItems } from "@/lib/db"
import { auditCreate } from "@/lib/audit"
import { uploadImage } from "@/lib/cloudinary"
import { ProductScrapeError, scrapeProduct } from "@/lib/services/product-scraper"
import { loadFashionProfile } from "@/lib/fashion/profile-server"
import { sizeAvailability } from "@/lib/fashion/size-match"
import { productMetadata } from "@/lib/fashion/product-import"
import { classifyScraped } from "@/lib/fashion/product-place"
import { cacheProduct, getCachedProduct } from "@/lib/fashion/product-link-cache"
import { productStatusOf } from "@/lib/saved/product"
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

/** Copies a shop photo to our own storage so it keeps working; falls back to the shop's link if that fails. */
async function keepPhoto(url: string, userId: string): Promise<string> {
  const uploaded = await uploadImage(url, "fashion", { tags: ["fashion", "chat-import", userId] }).catch(() => null)
  return uploaded?.success && uploaded.url ? uploaded.url : url
}

export const getProductFromLink: AiTool = {
  name: "get_product_from_link",
  description:
    "Read a shopping link (Amazon, Flipkart, Myntra, Ajio, Meesho) and return the product's real name, brand, category, price, MRP, colors, available sizes and rating, plus `place`: where it belongs (\"fashion\" for clothes, footwear and wearable accessories, \"saved\" for everything else such as electronics, appliances, home and kitchen, furniture). For fashion it also says whether the user's saved size is available. Call this FIRST whenever the user pastes a product link, and never guess product details from the link text.",
  parameters: z.object({
    url: z.string().url().describe("The product link the user pasted"),
  }),
  mutates: false,
  handler: async (args, ctx) => {
    try {
      const product = await loadProduct(args.url)
      const sizes = sizesOf(product)
      const place = classifyScraped(product)
      const availability =
        place.module === "fashion" ? sizeAvailability(await loadFashionProfile(ctx), place.category, sizes) : null

      return {
        success: true,
        name: product.product_name,
        brand: product.brand || null,
        place: place.module,
        category: place.category,
        price: num(product.price.current) ?? null,
        mrp: num(product.price.original) ?? null,
        discount: product.price.discount ?? null,
        color: product.color || null,
        colors: product.colors ?? [],
        availableSizes: sizes,
        rating: product.rating ?? null,
        photos: product.images.length,
        store: product.platform,
        yourSize: availability?.mySize ?? null,
        yourSizeAvailable:
          availability?.status === "available" ? true : availability?.status === "unavailable" ? false : null,
      }
    } catch (error) {
      if (error instanceof ProductScrapeError) return { success: false, error: error.message }
      console.error("[AI get_product_from_link] error:", error instanceof Error ? error.message : error)
      return { success: false, error: "Couldn't read that link." }
    }
  },
}

export const addProductFromLink: AiTool = {
  name: "add_product_from_link",
  description:
    "Add the product from a shopping link for the user. It decides the place by itself: clothes, footwear and wearable accessories go to Fashion (wardrobe or wishlist), everything else (electronics, appliances, home decor, furniture, books and so on) goes to Saved as a product with its category and price. Saves the real name, brand, price, photos and the buying link. Call get_product_from_link first. Use status \"wishlist\" unless the user says they already own or bought it, then use \"owned\".",
  parameters: z.object({
    url: z.string().url().describe("The product link"),
    status: z
      .enum(["wishlist", "owned", "wardrobe"])
      .default("wishlist")
      .describe("wishlist = want to buy, owned = already has it (\"wardrobe\" is accepted as the same as owned)"),
    size: z.string().optional().describe("The user's own size, only if they said it (for example M or 32). Fashion only."),
    notes: z.string().optional().describe("Notes the user wants saved with the item"),
  }),
  mutates: true,
  handler: async (args, ctx) => {
    let product: ScrapedProduct
    try {
      product = await loadProduct(args.url)
    } catch (error) {
      if (error instanceof ProductScrapeError) return { success: false, error: error.message }
      console.error("[AI add_product_from_link] error:", error instanceof Error ? error.message : error)
      return { success: false, error: "Couldn't read that link." }
    }

    const owned = args.status === "owned" || args.status === "wardrobe"
    const place = classifyScraped(product)

    // ─── Everything that is not clothing: Saved, as a product ───
    if (place.module === "saved") {
      const [existingSaved] = await db
        .select({ id: savedItems.id, title: savedItems.title, type: savedItems.type, metadata: savedItems.metadata })
        .from(savedItems)
        .where(
          and(
            eq(savedItems.workspaceId, ctx.workspaceId),
            eq(savedItems.userId, ctx.userId),
            eq(savedItems.url, product.buying_link)
          )
        )
        .limit(1)
      if (existingSaved) {
        return {
          success: false,
          alreadyAdded: true,
          place: "saved",
          name: existingSaved.title,
          status: productStatusOf(existingSaved) ?? "wishlist",
        }
      }

      const status = owned ? "owned" : "wishlist"
      const price = num(product.price.current)
      const imageUrl = product.images[0] ? await keepPhoto(product.images[0], ctx.userId) : undefined

      const [row] = await db
        .insert(savedItems)
        .values({
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          type: "product",
          title: product.product_name,
          url: product.buying_link,
          description: (args.notes || product.description || "").slice(0, 600) || undefined,
          imageUrl,
          tags: [place.category],
          metadata: {
            source: product.platform,
            type: "product",
            category: place.category,
            status,
            store: product.platform,
            brand: product.brand || undefined,
            price,
            originalPrice: num(product.price.original),
            currency: product.currency ?? "INR",
            rating: num(product.rating),
            color: product.color || undefined,
            buyingLink: product.buying_link,
          },
        })
        .returning()

      await auditCreate(ctx, "saved_items", row.id, row, { source: "ai_agent" })

      return {
        success: true,
        place: "saved",
        item: { id: row.id, name: row.title, status, category: place.category, price: price ?? null },
        photosSaved: imageUrl ? 1 : 0,
      }
    }

    // ─── Clothes, footwear, wearable accessories: Fashion ───
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
      return { success: false, alreadyAdded: true, place: "fashion", name: existing.name, status: existing.status }
    }

    const photos = await Promise.all(product.images.slice(0, MAX_PHOTOS).map((url) => keepPhoto(url, ctx.userId)))
    const [imageUrl, ...extraImages] = photos
    const fashionStatus = owned ? "wardrobe" : "wishlist"

    const [row] = await db
      .insert(fashionItems)
      .values({
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        name: product.product_name,
        status: fashionStatus,
        category: place.category || "general",
        brand: product.brand || undefined,
        color: product.color || undefined,
        size: args.size || undefined,
        price: product.price.current || undefined,
        imageUrl,
        images: extraImages.length ? extraImages : undefined,
        notes: args.notes || product.description || undefined,
        condition: fashionStatus === "wardrobe" ? "good" : undefined,
        metadata: { ...productMetadata(product), buyingLink: product.buying_link },
      })
      .returning()

    await auditCreate(ctx, "fashion_items", row.id, row, { source: "ai_agent" })

    const availability = sizeAvailability(await loadFashionProfile(ctx), place.category, sizesOf(product))
    return {
      success: true,
      place: "fashion",
      item: { id: row.id, name: row.name, status: row.status, brand: row.brand, price: row.price },
      photosSaved: photos.length,
      yourSize: availability.mySize,
      yourSizeAvailable: availability.status === "available" ? true : availability.status === "unavailable" ? false : null,
      availableSizes: sizesOf(product),
    }
  },
}
