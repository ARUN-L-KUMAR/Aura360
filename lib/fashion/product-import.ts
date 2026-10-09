import { getApiUrl } from "@/lib/utils/api"
import type { FashionMetadata, ScrapedProduct } from "@/lib/types/fashion"

/**
 * Copies photos that live on a shop's CDN into our own Cloudinary storage so they keep working
 * after the shop changes or blocks the link. If a copy fails the original link is kept.
 */
export async function persistImages(urls: string[]): Promise<string[]> {
  return Promise.all(
    urls.map(async (url) => {
      if (!url || url.startsWith("/") || url.includes("res.cloudinary.com")) return url
      try {
        const response = await fetch(getApiUrl("/api/fashion/upload-image"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: url, folder: "fashion" }),
        })
        if (!response.ok) return url
        const data = await response.json()
        return typeof data.url === "string" ? data.url : url
      } catch {
        return url
      }
    })
  )
}

const toNumber = (value?: string) => {
  const n = value ? Number.parseFloat(value) : Number.NaN
  return Number.isFinite(n) ? n : undefined
}

/** Shop details worth keeping on the item (shown on the detail view). Undefined values are dropped. */
export function productMetadata(data: ScrapedProduct): Partial<FashionMetadata> {
  const meta: Partial<FashionMetadata> = {
    originalPrice: toNumber(data.price.original),
    discount: data.price.discount,
    rating: toNumber(data.rating),
    reviewsCount: toNumber(data.reviews_count?.replace(/,/g, "")),
    platform: data.platform,
    availableSizes: Array.isArray(data.size) && data.size.length > 0 ? data.size : undefined,
    availableColors: data.colors && data.colors.length > 0 ? data.colors : undefined,
  }
  return Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined)) as Partial<FashionMetadata>
}

/** Main photo first, then the extras, without duplicates. */
export function galleryOf(item: { imageUrl: string | null; images?: string[] | null }): string[] {
  return Array.from(new Set([item.imageUrl, ...(item.images ?? [])].filter((u): u is string => Boolean(u))))
}
