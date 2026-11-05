/**
 * AI Action Confirmation Gate
 *
 * Ensures all mutating operations (writes/updates/deletions) are paused
 * and reviewed by the user with human-readable summaries before execution.
 */

import { getCachedProduct } from "@/lib/fashion/product-link-cache"
import { classifyScraped } from "@/lib/fashion/product-place"

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

    case "update_transaction": {
      const amount = args.amount !== undefined ? ` to ₹${args.amount}` : ""
      const category = args.category ? ` (${args.category})` : ""
      const desc = args.description ? ` "${args.description}"` : ""
      return `Update transaction${desc}${amount}${category}?`
    }

    case "delete_transaction": {
      return `Permanently delete this transaction (ID: ${args.id?.slice(0, 8)}...)?`
    }

    case "create_budget": {
      const amount = args.amount !== undefined ? `₹${args.amount}` : ""
      const category = args.category ? ` for "${args.category}"` : ""
      const month = args.month ? ` in ${args.month}` : ""
      return `Set monthly budget of ${amount}${category}${month}?`
    }

    case "update_budget": {
      const amount = args.amount !== undefined ? `₹${args.amount}` : ""
      const category = args.category ? ` for "${args.category}"` : ""
      return `Update budget limit${category} to ${amount}?`
    }

    case "log_workout": {
      const duration = args.duration ? `${args.duration}-min ` : ""
      const workoutType = args.workoutType || args.type || "workout"
      const date = args.date ? ` on ${args.date}` : ""
      return `Log a ${duration}${workoutType}${date}?`
    }

    case "update_workout": {
      const workoutType = args.workoutType || "workout"
      const duration = args.duration ? ` (${args.duration} mins)` : ""
      return `Update ${workoutType} log entry${duration}?`
    }

    case "delete_workout": {
      return `Permanently delete workout log (ID: ${args.id?.slice(0, 8)}...)?`
    }

    case "log_meal": {
      const mealType = args.mealType || "meal"
      const foodName = args.foodName ? ` "${args.foodName}"` : ""
      const calories = args.calories ? ` (${args.calories} kcal)` : ""
      const date = args.date ? ` on ${args.date}` : ""
      return `Log ${mealType}${foodName}${calories}${date}?`
    }

    case "update_meal": {
      const foodName = args.foodName ? ` "${args.foodName}"` : "meal"
      const calories = args.calories ? ` (${args.calories} kcal)` : ""
      return `Update ${foodName} entry${calories}?`
    }

    case "delete_meal": {
      return `Permanently delete meal log (ID: ${args.id?.slice(0, 8)}...)?`
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

    case "delete_note": {
      return `Permanently delete note (ID: ${args.id?.slice(0, 8)}...)?`
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

    case "add_product_from_link": {
      const owned = args.status === "owned" || args.status === "wardrobe"
      const product = typeof args.url === "string" ? getCachedProduct(args.url) : null
      if (!product) return `Add the product from this link as ${owned ? "something you own" : "a wishlist item"}?`
      const price = product.price.current ? ` (₹${product.price.current})` : ""
      const place = classifyScraped(product)
      if (place.module === "fashion") {
        return `Add "${product.product_name}"${price} to your ${owned ? "Wardrobe" : "Wishlist"}?`
      }
      return `Save "${product.product_name}"${price} to Saved as ${owned ? "owned" : "wishlist"} (${place.category})?`
    }

    case "add_skincare_product": {
      const name = args.productName ? ` "${args.productName}"` : " product"
      const brand = args.brand ? ` by ${args.brand}` : ""
      const bodyPart = args.bodyPart ? ` (${args.bodyPart})` : ""
      return `Add skincare product${name}${brand}${bodyPart} to your routine?`
    }

    case "update_skincare_product": {
      const name = args.productName ? ` "${args.productName}"` : "product"
      return `Update skincare ${name} in your routine?`
    }

    case "delete_skincare_product": {
      return `Remove skincare product from your routine (ID: ${args.id?.slice(0, 8)}...)?`
    }

    case "save_item": {
      const title = args.title ? ` "${args.title}"` : " item"
      if (args.type === "product") {
        const price = args.price ? ` (₹${args.price})` : ""
        return `Save${title}${price} to Saved as ${args.status === "owned" ? "owned" : "wishlist"}?`
      }
      const type = args.type ? ` (${args.type})` : ""
      return `Save${title}${type} to your saved items?`
    }

    default:
      return `Execute ${tool.replace(/_/g, " ")}?`
  }
}
