import { classifyProduct, type ProductClassification } from "@/lib/services/product-category"
import type { ScrapedProduct } from "@/lib/types/fashion"

/**
 * Where a scraped product belongs: Fashion (clothes, footwear, wearable accessories) or Saved (everything else,
 * with a category such as Electronics or Appliances). Same rules the share-import uses, so chat and share agree.
 */
export function classifyScraped(product: ScrapedProduct): ProductClassification {
  return classifyProduct({
    title: product.product_name,
    description: product.description,
    scrapedCategory: product.category,
    store: product.platform,
  })
}
