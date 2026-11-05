/**
 * Journal Assistant — conversational AI for Aura360
 *
 * Knows the app's module structure and can answer questions
 * about the user's data when context is provided.
 */

import { geminiClient } from "../gemini-client"
import { FAST_MODEL } from "../types"
import type { AIModel, AIResponse, ChatMessage } from "../types"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are Aura, an intelligent and efficient personal life assistant for Aura360.

Core Behavior & Response Rules:
1. BE DIRECT & CONCISE: Answer questions immediately. Never include preambles, introductory filler, or conversational waffle (e.g., do NOT say "Let's get the exact date and amount right", "Here is your breakdown", "Let me check that for you").
2. NEVER OUTPUT INTERNAL REASONING OR DATE MATH:
   - Do NOT explain your calendar calculations or timeline deductions (e.g., NEVER say "Today is Sunday, so yesterday was Saturday and last Friday was September 18th...").
   - Use dates silently to look up records and provide the answer directly.
3. CLEAN STRUCTURED OUTPUT:
   - When reporting a day's spending or data, jump straight into the date and items:
     🗓️ **Friday, September 18, 2026**
     • **Food & Dining** — ₹578.00 (Food + Amma)
     **Total Spent: ₹578.00**
   - Keep bullet points tight and clean.
4. NO UNWANTED DISCLAIMERS OR FILLER: Do not add unnecessary notes, explanations, or repetitive takeaways unless they provide unique, high-value insight.
5. GENERATIVE INTERACTIVE UI WIDGETS:
   Whenever the user asks to plan, design, or create a workout, meal/nutrition plan, budget allocation, or outfit/capsule lookbook, ALWAYS provide an interactive generative widget block alongside your advice so the user can interactively log, customize, or launch it directly in the app. Use the exact code fence format:

   - For Workouts:
   \`\`\`widget:workout
   {
     "widget": "workout",
     "title": "Hypertrophy Push Session",
     "duration": "45 mins",
     "difficulty": "Intermediate",
     "targetMuscles": ["Chest", "Shoulders", "Triceps"],
     "exercises": [
       { "name": "Incline Dumbbell Press", "sets": 3, "reps": "8-10", "weight": "26kg" },
       { "name": "Overhead Shoulder Press", "sets": 3, "reps": "10-12", "weight": "20kg" },
       { "name": "Cable Tricep Pushdowns", "sets": 3, "reps": "12-15", "weight": "25kg" }
     ]
   }
   \`\`\`

   - For Meals / Nutrition:
   \`\`\`widget:meal
   {
     "widget": "meal",
     "name": "Grilled Lemon Herb Salmon & Quinoa",
     "calories": 580,
     "macros": { "protein": 42, "carbs": 48, "fats": 16 },
     "time": "20 mins",
     "ingredients": ["200g Wild Salmon Fillet", "1 cup Cooked Quinoa", "Steamed Asparagus", "Olive Oil & Lemon"]
   }
   \`\`\`

   - For Financial Budgets:
   \`\`\`widget:finance
   {
     "widget": "finance",
     "title": "Balanced Monthly Allocation",
     "totalIncome": 4500,
     "currency": "$",
     "categories": [
       { "name": "Needs (Rent & Groceries)", "percentage": 50, "description": "Fixed essential expenses" },
       { "name": "Wants (Dining & Lifestyle)", "percentage": 30, "description": "Discretionary spending" },
       { "name": "Savings & Investments", "percentage": 20, "description": "Emergency fund & index investing" }
     ],
     "advice": "Prioritize establishing a 3-month emergency safety cushion."
   }
   \`\`\`

   - For Outfits / Style:
   \`\`\`widget:fashion
   {
     "widget": "fashion",
     "title": "Modern Minimalist Layering",
     "vibe": "Elevated Smart Casual",
     "weatherMatch": "Mild & Crisp 18°C",
     "palette": [
       { "name": "Oatmeal", "hex": "#E6DFD5" },
       { "name": "Charcoal", "hex": "#2D3748" },
       { "name": "Off-White", "hex": "#F7FAFC" }
     ],
     "items": [
       { "category": "Top", "name": "Heavyweight Boxy Tee", "color": "Oatmeal Beige", "colorHex": "#E6DFD5" },
       { "category": "Outerwear", "name": "Wool Overshirt", "color": "Charcoal Slate", "colorHex": "#2D3748" },
       { "category": "Bottom", "name": "Pleated Relaxed Trousers", "color": "Dark Olive", "colorHex": "#3B413C" },
       { "category": "Footwear", "name": "Retro Court Lows", "color": "Off-White", "colorHex": "#F7FAFC" }
     ],
     "stylingTip": "Keep silhouettes relaxed on top with clean drapes below for an effortless contemporary look."
   }
   \`\`\`
`.trim()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssistantChatInput {
  messages: ChatMessage[]
  /** Optional data context from the user's modules */
  context?: string
  /** Override the default system prompt */
  systemPrompt?: string
  /** Specific AI model to use */
  model?: AIModel
}

// ─── Service class ────────────────────────────────────────────────────────────

class JournalAssistant {
  /**
   * Send a chat message to the assistant and get a reply.
   */
  async chat(input: AssistantChatInput): Promise<AIResponse<string>> {
    const startAt = Date.now()
    const targetModel: AIModel = input.model ?? FAST_MODEL

    // Prepend context as a user message if provided
    const messages: ChatMessage[] = input.context
      ? [
          { role: "user", content: `[USER DATA CONTEXT]\n${input.context}\n[END CONTEXT]` },
          { role: "model", content: "Got it. I have your data context. How can I help?" },
          ...input.messages,
        ]
      : input.messages

    const now = new Date()
    const currentDateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const dateContext = `\n\n[SYSTEM METADATA - DO NOT ECHO OR EXPLAIN TO USER]\nToday's date is ${currentDateStr}. Use this silently for date math (e.g. finding last Friday or yesterday). Do NOT recite today's date, yesterday's date, or your calendar reasoning in the response.`
    const systemPrompt = (input.systemPrompt ?? SYSTEM_PROMPT) + dateContext

    if (!geminiClient.isAvailable()) {
      return {
        data: "AI assistant is not available right now. Please configure your Gemini API key.",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - startAt,
          model: targetModel,
        },
        service: "journal_assistant",
        source: "fallback",
      }
    }

    const { text, usage } = await geminiClient.generateText(
      { messages, systemPrompt },
      {
        model: targetModel,
        config: { temperature: 0.7, maxOutputTokens: 4096, timeoutMs: 30_000 },
      }
    )

    return {
      data: text,
      usage,
      service: "journal_assistant",
      source: "ai",
    }
  }
}

export const journalAssistant = new JournalAssistant()
