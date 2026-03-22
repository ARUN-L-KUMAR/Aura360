/**
 * Journal Assistant — conversational AI for Aura360
 *
 * Knows the app's module structure and can answer questions
 * about the user's data when context is provided.
 */

import { geminiClient } from "../gemini-client"
import { FAST_MODEL } from "../types"
import type { AIResponse, ChatMessage } from "../types"

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `
You are Aura, a smart personal life assistant built into Aura360 — a unified productivity app.

Aura360 helps users manage:
- 💰 Finance: transactions, wallet balances, subscriptions, budgets
- 👗 Fashion: wardrobe, wishlist items, outfit planning
- 🏋️ Fitness: workout logs, measurements, health goals
- 🍽️ Food: meal logs, nutrition tracking, recipes
- 📝 Notes: articles, ideas, bookmarks
- 🏷️ Saved: links, products, content from the web
- ⏰ Time: activity and productivity logs
- 💆 Skincare: product routines and tracking

Be helpful, concise, and friendly. When the user provides their data as context, use it to give personalised insights. Always respond in a conversational, natural tone. Keep responses brief unless asked for detail.
`.trim()

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AssistantChatInput {
  messages: ChatMessage[]
  /** Optional data context from the user's modules */
  context?: string
  /** Override the default system prompt */
  systemPrompt?: string
}

// ─── Service class ────────────────────────────────────────────────────────────

class JournalAssistant {
  /**
   * Send a chat message to the assistant and get a reply.
   */
  async chat(input: AssistantChatInput): Promise<AIResponse<string>> {
    const startAt = Date.now()

    // Prepend context as a user message if provided
    const messages: ChatMessage[] = input.context
      ? [
          { role: "user", content: `[USER DATA CONTEXT]\n${input.context}\n[END CONTEXT]` },
          { role: "model", content: "Got it. I have your data context. How can I help?" },
          ...input.messages,
        ]
      : input.messages

    const systemPrompt = input.systemPrompt ?? SYSTEM_PROMPT

    if (!geminiClient.isAvailable()) {
      return {
        data: "AI assistant is not available right now. Please configure your Gemini API key.",
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          latencyMs: Date.now() - startAt,
          model: FAST_MODEL,
        },
        service: "journal_assistant",
        source: "fallback",
      }
    }

    const { text, usage } = await geminiClient.generateText(
      { messages, systemPrompt },
      {
        model: FAST_MODEL,
        config: { temperature: 0.7, maxOutputTokens: 1024, timeoutMs: 20_000 },
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
