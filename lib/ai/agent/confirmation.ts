/**
 * AI Action Confirmation Gate
 *
 * Ensures all mutating operations (writes/updates) are paused
 * and reviewed by the user with human-readable summaries before execution.
 */

import { getCachedProduct } from "@/lib/fashion/product-link-cache"

export interface PendingAction {
  tool: string
  args: Record<string, any>
  summary: string
}

export function buildSummary(tool: string, args: Record<string, any>): string {
  switch (tool) {
    case "create_transaction": {
      const type = args.type ? String(args.type).toUpperCase() : "TRANSACTION"
      const amount = args.amount !== undefined ? `₹${args.amount}` : ""
      const category = args.category ? ` under "${args.category}"` : ""
      const date = args.date ? ` on ${args.date}` : ""
      return `Log ${type} of ${amount}${category}${date}?`
    }

    case "create_budget": {
      const amount = args.amount !== undefined ? `₹${args.amount}` : ""
      const category = args.category ? ` for "${args.category}"` : ""
      const month = args.month ? ` in ${args.month}` : ""
      return `Set monthly budget of ${amount}${category}${month}?`
    }

    case "log_workout": {
      const duration = args.duration ? `${args.duration}-min ` : ""
      const workoutType = args.workoutType || args.type || "workout"
      const date = args.date ? ` on ${args.date}` : ""
      return `Log a ${duration}${workoutType}${date}?`
    }

    case "log_meal": {
      const mealType = args.mealType || "meal"
      const foodName = args.foodName ? ` "${args.foodName}"` : ""
      const calories = args.calories ? ` (${args.calories} kcal)` : ""
      const date = args.date ? ` on ${args.date}` : ""
      return `Log ${mealType}${foodName}${calories}${date}?`
    }

    case "create_note": {
      const title = args.title ? ` "${args.title}"` : " new note"
      const category = args.category ? ` under ${args.category}` : ""
      return `Create note${title}${category}?`
    }

    case "update_note": {
      const title = args.title ? ` "${args.title}"` : ""
      return `Update note${title}?`
    }

    case "log_time_entry": {
      const duration = args.duration ? `${args.duration} mins` : "time"
      const activity = args.activity ? ` on "${args.activity}"` : ""
      const date = args.date ? ` on ${args.date}` : ""
      return `Log ${duration}${activity}${date}?`
    }

    case "add_fashion_item": {
      const name = args.name ? ` "${args.name}"` : " item"
      const target = args.status === "wishlist" ? "Wishlist" : "Wardrobe"
      const price = args.price ? ` (₹${args.price})` : ""
      return `Add${name} to your ${target}${price}?`
    }

    case "add_fashion_item_from_link": {
      const target = args.status === "wardrobe" ? "Wardrobe" : "Wishlist"
      const product = typeof args.url === "string" ? getCachedProduct(args.url) : null
      if (!product) return `Add the product from this link to your ${target}?`
      const price = product.price.current ? ` (₹${product.price.current})` : ""
      return `Add "${product.product_name}"${price} to your ${target}?`
    }

    case "add_skincare_product": {
      const name = args.productName ? ` "${args.productName}"` : " product"
      const brand = args.brand ? ` by ${args.brand}` : ""
      const bodyPart = args.bodyPart ? ` (${args.bodyPart})` : ""
      return `Add skincare product${name}${brand}${bodyPart} to your routine?`
    }

    case "save_item": {
      const title = args.title ? ` "${args.title}"` : " item"
      const type = args.type ? ` (${args.type})` : ""
      return `Save${title}${type} to your saved items?`
    }

    default:
      return `Execute ${tool.replace(/_/g, " ")}?`
  }
}
