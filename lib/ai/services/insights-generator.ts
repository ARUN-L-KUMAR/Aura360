/**
 * Insights Generator — AI-powered data insights for each module
 *
 * Takes raw data arrays from the DB and returns structured Insight objects
 * that can be surfaced in the UI.
 */

import { geminiClient } from "../gemini-client"
import { FAST_MODEL } from "../types"
import type { AIResponse, Insight, InsightModule } from "../types"

// ─── Input types ──────────────────────────────────────────────────────────────

export interface FinanceInsightInput {
  transactions: Array<{
    date: string
    type: string
    category: string
    amount: string | number
    description: string
    paymentMethod?: string | null
  }>
  /** Total wallet balance across payment methods */
  totalBalance?: number
  /** Currency symbol, default ₹ */
  currency?: string
}

export interface FitnessInsightInput {
  logs: Array<{
    date: string
    type: string
    workoutType?: string | null
    duration?: number | null
    caloriesBurned?: number | null
    intensity?: string | null
    notes?: string | null
  }>
}

export interface FoodInsightInput {
  logs: Array<{
    date: string
    mealType: string
    foodName: string
    calories?: number | null
    protein?: string | number | null
    carbs?: string | number | null
    fats?: string | number | null
  }>
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildFinancePrompt(input: FinanceInsightInput): string {
  const currency = input.currency ?? "₹"
  const summary = input.transactions
    .slice(0, 30)
    .map((t) => `${t.date} | ${t.type} | ${t.category} | ${currency}${t.amount} | ${t.description}`)
    .join("\n")

  return `
You are a personal finance analyst. Analyze the following transaction history and generate 3–5 actionable insights.

Return a JSON array of insight objects. Each object must have exactly these fields:
{
  "title": "<short insight headline>",
  "description": "<2-sentence explanation with data points>",
  "severity": <"info" | "tip" | "warning" | "success">
}

Rules:
- "warning" for overspending, unusual patterns, or upcoming bills
- "tip" for actionable savings or improvement suggestions
- "success" for positive patterns (savings goals hit, spending reduced)
- "info" for neutral observations
- Ground all insights in the actual data (mention specific categories, amounts, or dates)
- Return ONLY the JSON array, no markdown, no explanation

${input.totalBalance !== undefined ? `Current wallet balance: ${currency}${input.totalBalance.toFixed(2)}` : ""}

Transaction history (most recent first):
${summary}
`.trim()
}

function buildFitnessPrompt(input: FitnessInsightInput): string {
  const summary = input.logs
    .slice(0, 20)
    .map((l) =>
      `${l.date} | ${l.workoutType ?? l.type} | ${l.duration ?? "?"}min | ${l.caloriesBurned ?? "?"}kcal | ${l.intensity ?? "?"}`
    )
    .join("\n")

  return `
You are a personal fitness coach. Analyze the following workout logs and generate 3–5 actionable insights.

Return a JSON array with each object having:
{
  "title": "<short insight headline>",
  "description": "<2-sentence explanation>",
  "severity": <"info" | "tip" | "warning" | "success">
}

Rules:
- "warning" for rest-day gaps, overtraining, or missed sessions
- "tip" for workout variety or progressive overload suggestions
- "success" for streaks, consistency, or goal achievements
- Return ONLY the JSON array, no markdown

Workout logs (newest first):
${summary}
`.trim()
}

function buildFoodPrompt(input: FoodInsightInput): string {
  const summary = input.logs
    .slice(0, 25)
    .map((l) =>
      `${l.date} | ${l.mealType} | ${l.foodName} | ${l.calories ?? "?"}kcal | P:${l.protein ?? "?"}g C:${l.carbs ?? "?"}g F:${l.fats ?? "?"}g`
    )
    .join("\n")

  return `
You are a nutrition coach. Analyze the following meal logs and generate 3–5 actionable insights.

Return a JSON array with each object having:
{
  "title": "<short insight headline>",
  "description": "<2-sentence explanation>",
  "severity": <"info" | "tip" | "warning" | "success">
}

Rules:
- "warning" for calorie excess, macro imbalances, or skipped meals
- "tip" for meal variety, timing, or nutrition suggestions
- "success" for hitting daily targets or consistent healthy choices
- Return ONLY the JSON array, no markdown

Meal logs (newest first):
${summary}
`.trim()
}

// ─── Fallback insights ────────────────────────────────────────────────────────

function basicInsights(module: InsightModule): Insight[] {
  const map: Record<InsightModule, Insight> = {
    finance: {
      id: "fallback-finance",
      module: "finance",
      severity: "info",
      title: "Track more transactions",
      description: "Add more transactions to get personalised AI insights about your spending patterns.",
    },
    fitness: {
      id: "fallback-fitness",
      module: "fitness",
      severity: "info",
      title: "Log your workouts",
      description: "Track your workouts consistently to receive AI-powered fitness insights and recommendations.",
    },
    food: {
      id: "fallback-food",
      module: "food",
      severity: "info",
      title: "Log your meals",
      description: "Log meals regularly to get personalised nutrition insights and macro tracking.",
    },
  }
  return [map[module]]
}

// ─── Service class ────────────────────────────────────────────────────────────

class InsightsGenerator {
  private async generate(
    module: InsightModule,
    prompt: string
  ): Promise<AIResponse<Insight[]>> {
    const startAt = Date.now()

    if (!geminiClient.isAvailable()) {
      return {
        data: basicInsights(module),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: 0, model: FAST_MODEL },
        service: "insights_generator",
        source: "fallback",
      }
    }

    try {
      const { data: rawArray, usage } = await geminiClient.generateJson<
        Array<{ title: string; description: string; severity: string }>
      >(
        { prompt },
        { model: FAST_MODEL, config: { temperature: 0.4, maxOutputTokens: 1024, timeoutMs: 15_000 } }
      )

      const insights: Insight[] = rawArray.map((item, i) => ({
        id: `${module}-insight-${i}`,
        module,
        title: item.title,
        description: item.description,
        severity: (["info", "tip", "warning", "success"].includes(item.severity)
          ? item.severity
          : "info") as Insight["severity"],
      }))

      return { data: insights, usage, service: "insights_generator", source: "ai" }
    } catch (err) {
      console.warn(`[ai/insights-generator] Failed for ${module}:`, err)
      return {
        data: basicInsights(module),
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, latencyMs: Date.now() - startAt, model: FAST_MODEL },
        service: "insights_generator",
        source: "fallback",
      }
    }
  }

  async generateFinanceInsights(input: FinanceInsightInput): Promise<AIResponse<Insight[]>> {
    return this.generate("finance", buildFinancePrompt(input))
  }

  async generateFitnessInsights(input: FitnessInsightInput): Promise<AIResponse<Insight[]>> {
    return this.generate("fitness", buildFitnessPrompt(input))
  }

  async generateFoodInsights(input: FoodInsightInput): Promise<AIResponse<Insight[]>> {
    return this.generate("food", buildFoodPrompt(input))
  }
}

export const insightsGenerator = new InsightsGenerator()
