/**
 * GET /api/ai/context
 *
 * Gathers a concise text summary of user's active workspace data
 * to supply context to the AI assistant.
 */

import { NextResponse } from "next/server"
import { getWorkspaceContext } from "@/lib/auth-helpers"
import { db, transactions, notes, fitness, food, skincare, savedItems, fashionItems } from "@/lib/db"
import { eq, desc, and } from "drizzle-orm"

export async function getAIContext(workspaceId: string, userId: string) {
  // Fetch recent 10 transactions
  const recentTransactions = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      category: transactions.category,
      description: transactions.description,
      date: transactions.date,
    })
    .from(transactions)
    .where(and(eq(transactions.workspaceId, workspaceId), eq(transactions.userId, userId)))
    .orderBy(desc(transactions.date))
    .limit(10)
    .catch(() => [])

  // Fetch fashion items (wardrobe and wishlist)
  const recentFashion = await db
    .select({
      name: fashionItems.name,
      category: fashionItems.category,
      subcategory: fashionItems.subcategory,
      brand: fashionItems.brand,
      color: fashionItems.color,
      price: fashionItems.price,
      status: fashionItems.status,
      isFavorite: fashionItems.isFavorite,
    })
    .from(fashionItems)
    .where(and(eq(fashionItems.workspaceId, workspaceId), eq(fashionItems.userId, userId)))
    .orderBy(desc(fashionItems.createdAt))
    .limit(40)
    .catch(() => [])

  // Fetch recent 5 notes
  const recentNotes = await db
    .select({
      title: notes.title,
      category: notes.category,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.userId, userId)))
    .orderBy(desc(notes.updatedAt))
    .limit(5)
    .catch(() => [])

  // Fetch recent 5 fitness logs
  const recentFitness = await db
    .select({
      workoutType: fitness.workoutType,
      type: fitness.type,
      duration: fitness.duration,
      caloriesBurned: fitness.caloriesBurned,
      date: fitness.date,
    })
    .from(fitness)
    .where(and(eq(fitness.workspaceId, workspaceId), eq(fitness.userId, userId)))
    .orderBy(desc(fitness.date))
    .limit(5)
    .catch(() => [])

  // Fetch recent 5 food logs
  const recentFood = await db
    .select({
      foodName: food.foodName,
      mealType: food.mealType,
      calories: food.calories,
      date: food.date,
    })
    .from(food)
    .where(and(eq(food.workspaceId, workspaceId), eq(food.userId, userId)))
    .orderBy(desc(food.date))
    .limit(5)
    .catch(() => [])

  // Fetch recent 5 skincare items
  const recentSkincare = await db
    .select({
      productName: skincare.productName,
      brand: skincare.brand,
      status: skincare.status,
      bodyPart: skincare.bodyPart,
    })
    .from(skincare)
    .where(and(eq(skincare.workspaceId, workspaceId), eq(skincare.userId, userId)))
    .limit(5)
    .catch(() => [])

  // Fetch recent saved items
  const recentSaved = await db
    .select({
      title: savedItems.title,
      url: savedItems.url,
      type: savedItems.type,
    })
    .from(savedItems)
    .where(and(eq(savedItems.workspaceId, workspaceId), eq(savedItems.userId, userId)))
    .limit(5)
    .catch(() => [])

  // Build human-readable context summary
  const sections: string[] = []

  if (recentTransactions.length > 0) {
    const items = recentTransactions
      .map((t) => `- ${t.date}: ${t.type.toUpperCase()} ₹${t.amount} (${t.category ?? "General"}${t.description ? ` - ${t.description}` : ""})`)
      .join("\n")
    sections.push(`Recent Transactions:\n${items}`)
  }

  if (recentFashion.length > 0) {
    const wardrobe = recentFashion.filter((f) => f.status === "wardrobe")
    const wishlist = recentFashion.filter((f) => f.status === "wishlist")

    const items = recentFashion
      .map(
        (f) =>
          `- ${f.name} [Category: ${f.category}, Status: ${f.status}${f.color ? `, Color: ${f.color}` : ""}${f.brand ? `, Brand: ${f.brand}` : ""}${f.price ? `, Price: ₹${f.price}` : ""}${f.isFavorite ? `, Favorite: Yes` : ""}]`
      )
      .join("\n")

    sections.push(
      `Fashion Collection (${recentFashion.length} items: ${wardrobe.length} in Wardrobe, ${wishlist.length} in Wishlist):\n${items}`
    )
  }

  if (recentNotes.length > 0) {
    const items = recentNotes
      .map((n) => `- ${n.title} (${n.category ?? "General"})`)
      .join("\n")
    sections.push(`Recent Notes:\n${items}`)
  }

  if (recentFitness.length > 0) {
    const items = recentFitness
      .map((f) => `- ${f.date}: ${f.workoutType || f.type} (${f.duration ?? 0}m, ${f.caloriesBurned ?? 0} kcal burned)`)
      .join("\n")
    sections.push(`Recent Fitness Logs:\n${items}`)
  }

  if (recentFood.length > 0) {
    const items = recentFood
      .map((f) => `- ${f.date}: ${f.mealType} - ${f.foodName} (${f.calories ?? 0} kcal)`)
      .join("\n")
    sections.push(`Recent Meals:\n${items}`)
  }

  if (recentSkincare.length > 0) {
    const items = recentSkincare
      .map((s) => `- ${s.productName}${s.brand ? ` by ${s.brand}` : ""} (${s.bodyPart}, ${s.status})`)
      .join("\n")
    sections.push(`Skincare Routine Products:\n${items}`)
  }

  if (recentSaved.length > 0) {
    const items = recentSaved
      .map((s) => `- ${s.title ?? s.url} (${s.type ?? "General"})`)
      .join("\n")
    sections.push(`Saved Bookmarks/Items:\n${items}`)
  }

  const contextText = sections.length > 0 
    ? sections.join("\n\n")
    : "The user has not added any data logs yet in this workspace."

  return {
    context: contextText,
    hasData: sections.length > 0,
    summaryCounts: {
      transactions: recentTransactions.length,
      fashion: recentFashion.length,
      notes: recentNotes.length,
      fitness: recentFitness.length,
      food: recentFood.length,
      skincare: recentSkincare.length,
      saved: recentSaved.length,
    }
  }
}

export async function GET() {
  try {
    const { workspaceId, userId } = await getWorkspaceContext()
    const result = await getAIContext(workspaceId, userId)
    return NextResponse.json(result)
  } catch (error) {
    console.error("[GET /api/ai/context] error:", error)
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json({ context: "", hasData: false, error: "Failed to load context" }, { status: 500 })
  }
}
