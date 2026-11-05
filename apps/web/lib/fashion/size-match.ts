import type { FashionProfileData } from "@/lib/fashion/profile"

export type SizeKind = "shoes" | "bottoms" | "dresses" | "tops"

/** Which of the user's saved sizes applies to an item of this category (null = sizes don't apply, e.g. watches). */
export function sizeKindForCategory(category: string): SizeKind | null {
  const c = category.toLowerCase()
  if (/bag|watch|jewel|sunglass|accessor|belt|wallet|cap\b|hat\b|scarf/.test(c)) return null
  if (/shoe|sneaker|sandal|boot|footwear|slipper|loafer|heel/.test(c)) return "shoes"
  if (/bottom|jean|trouser|pant|short|skirt|chino|jogger|legging/.test(c)) return "bottoms"
  if (/dress|gown|saree|sari|lehenga|jumpsuit/.test(c)) return "dresses"
  return "tops"
}

/** The size the user saved for this kind of item, or null. */
export function savedSizeFor(profile: FashionProfileData | null | undefined, category: string): string | null {
  if (!profile) return null
  const kind = sizeKindForCategory(category)
  if (!kind) return null
  const value = { shoes: profile.shoeSize, bottoms: profile.bottomSize, dresses: profile.dressSize, tops: profile.topSize }[kind]
  return value?.trim() ? value.trim() : null
}

/** Makes "XXL" and "2XL", "UK 9" and "9", "Free Size" and "freesize" comparable. */
export function normalizeSize(size: string): string {
  const s = size
    .toLowerCase()
    .replace(/[\s\-_/.]+/g, "")
    .replace(/^(uk|us|eu|in)/, "")
  const alias: Record<string, string> = { "2xl": "xxl", "3xl": "xxxl", "4xl": "xxxxl", "2xs": "xxs", onesize: "freesize", free: "freesize", os: "freesize" }
  return alias[s] ?? s
}

export type SizeAvailability =
  | { status: "unknown"; mySize: string | null }
  | { status: "available"; mySize: string; match: string }
  | { status: "unavailable"; mySize: string }

/**
 * Is the user's saved size among the sizes a product is sold in?
 * "unknown" when the product's sizes or the user's size aren't known, or when they can't be compared
 * (for example the shop lists EU shoe sizes and the user saved UK).
 */
export function sizeAvailability(
  profile: FashionProfileData | null | undefined,
  category: string,
  productSizes: string[] | undefined | null
): SizeAvailability {
  const mySize = savedSizeFor(profile, category)
  if (!mySize || !productSizes || productSizes.length === 0) return { status: "unknown", mySize }

  if (sizeKindForCategory(category) === "shoes") {
    const numbers = productSizes.map((s) => Number.parseFloat(s.replace(/[^\d.]/g, ""))).filter(Number.isFinite)
    const system = profile?.shoeSystem ?? "UK"
    const looksEu = numbers.length > 0 && numbers.every((n) => n >= 30)
    if ((system === "EU") !== looksEu) return { status: "unknown", mySize }
  }

  const wanted = normalizeSize(mySize)
  const match = productSizes.find((s) => normalizeSize(s) === wanted)
  return match ? { status: "available", mySize, match } : { status: "unavailable", mySize }
}
