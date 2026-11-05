/**
 * Unified OpenAI & Groq Client for Aura360
 *
 * Implements tool-calling and text generation compatible with
 * OpenAI's v1 chat completions API and Groq's high-speed LPU inference.
 */

import OpenAI from "openai"
import {
  AIModel,
  AIProvider,
  AIUsageMetadata,
  AiFunctionCall,
  AiGenerateResult,
  AiToolDeclaration,
  ChatMessage,
  GenerationConfig,
  getProviderForModel,
} from "./types"

export class LLMProviderError extends Error {
  statusCode?: number
  provider?: AIProvider

  constructor(
    message: string,
    statusCode?: number,
    provider?: AIProvider
  ) {
    super(message)
    this.name = "LLMProviderError"
    this.statusCode = statusCode
    this.provider = provider
  }
}

interface LLMInput {
  prompt?: string
  messages?: ChatMessage[]
  systemPrompt?: string
  tools?: AiToolDeclaration[]
}

class OpenAIGroqClient {
  private openaiInstance: OpenAI | null = null
  private groqInstance: OpenAI | null = null

  private getClient(provider: "openai" | "groq"): OpenAI {
    if (provider === "groq") {
      const apiKey = process.env.GROQ_API_KEY
      if (!apiKey || apiKey === "your_groq_api_key_here") {
        throw new LLMProviderError("GROQ_API_KEY is not configured in .env.local", 401, "groq")
      }
      if (!this.groqInstance) {
        this.groqInstance = new OpenAI({
          apiKey,
          baseURL: "https://api.groq.com/openai/v1",
        })
      }
      return this.groqInstance
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey || apiKey === "your_openai_api_key_here") {
      throw new LLMProviderError("OPENAI_API_KEY is not configured in .env.local", 401, "openai")
    }
    if (!this.openaiInstance) {
      this.openaiInstance = new OpenAI({ apiKey })
    }
    return this.openaiInstance
  }

  /**
   * Convert our internal ChatMessage[] to OpenAI ChatCompletionMessageParam[]
   */
  private formatMessages(
    input: LLMInput
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const formatted: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []

    if (input.systemPrompt) {
      formatted.push({
        role: "system",
        content: input.systemPrompt,
      })
    }

    if (input.messages && input.messages.length > 0) {
      let callCounter = 0

      for (let i = 0; i < input.messages.length; i++) {
        const msg = input.messages[i]

        if (msg.role === "function" || msg.functionResponse) {
          const fn = msg.functionResponse || (msg.parts?.[0] as any)?.functionResponse
          const name = fn?.name || "tool"
          const result = fn?.response ?? {}
          formatted.push({
            role: "tool",
            tool_call_id: `call_${name}_${callCounter}`,
            content: typeof result === "string" ? result : JSON.stringify(result),
          })
        } else if (msg.role === "model" || (msg as any).role === "assistant") {
          if (msg.functionCall) {
            callCounter++
            formatted.push({
              role: "assistant",
              content: msg.content || null,
              tool_calls: [
                {
                  id: `call_${msg.functionCall.name}_${callCounter}`,
                  type: "function",
                  function: {
                    name: msg.functionCall.name,
                    arguments: JSON.stringify(msg.functionCall.args || {}),
                  },
                },
              ],
            })
          } else {
            formatted.push({
              role: "assistant",
              content: msg.content ?? "",
            })
          }
        } else {
          // user message
          formatted.push({
            role: "user",
            content: msg.content ?? "",
          })
        }
      }
    } else if (input.prompt) {
      formatted.push({
        role: "user",
        content: input.prompt,
      })
    }

    return formatted
  }

  /**
   * Convert internal AiToolDeclaration to OpenAI ChatCompletionTool
   */
  private formatTools(
    tools?: AiToolDeclaration[]
  ): OpenAI.Chat.Completions.ChatCompletionTool[] | undefined {
    if (!tools || tools.length === 0) return undefined

    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    }))
  }

  /**
   * Generate text completion using OpenAI or Groq
   */
  async generateText(
    input: LLMInput,
    options: {
      model: AIModel
      config?: GenerationConfig
    }
  ): Promise<{ text: string; usage: AIUsageMetadata }> {
    const provider = getProviderForModel(options.model)
    if (provider !== "openai" && provider !== "groq") {
      throw new LLMProviderError(`Model ${options.model} is not handled by OpenAI/Groq client`)
    }

    const client = this.getClient(provider)
    const messages = this.formatMessages(input)
    const startAt = Date.now()

    try {
      const response = await client.chat.completions.create({
        model: options.model,
        messages,
        temperature: options.config?.temperature ?? 0.2,
        max_tokens: options.config?.maxOutputTokens ?? 4096,
        ...(options.config?.jsonMode ? { response_format: { type: "json_object" } } : {}),
      })

      const latencyMs = Date.now() - startAt
      const choice = response.choices[0]
      const text = choice?.message?.content ?? ""

      const usage: AIUsageMetadata = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        latencyMs,
        model: options.model,
      }

      return { text, usage }
    } catch (err: any) {
      const status = err?.status || err?.statusCode || 500
      if (provider === "groq" && (status === 404 || status === 413 || status === 429) && options.model !== "qwen/qwen3.8-27b") {
        return this.generateText(input, { ...options, model: "qwen/qwen3.8-27b" })
      }
      throw new LLMProviderError(
        `[${provider.toUpperCase()}] API Error (${options.model}): ${err.message || String(err)}`,
        status,
        provider
      )
    }
  }

  /**
   * Generate response with tool-calling support
   */
  async generateWithTools(
    input: LLMInput,
    options: {
      model: AIModel
      config?: GenerationConfig
    }
  ): Promise<AiGenerateResult> {
    const provider = getProviderForModel(options.model)
    if (provider !== "openai" && provider !== "groq") {
      throw new LLMProviderError(`Model ${options.model} is not handled by OpenAI/Groq client`)
    }

    const client = this.getClient(provider)
    const messages = this.formatMessages(input)
    const tools = this.formatTools(input.tools)
    const startAt = Date.now()

    try {
      const response = await client.chat.completions.create({
        model: options.model,
        messages,
        tools,
        tool_choice: tools && tools.length > 0 ? "auto" : undefined,
        temperature: options.config?.temperature ?? 0.2,
        max_tokens: options.config?.maxOutputTokens ?? 4096,
      })

      const latencyMs = Date.now() - startAt
      const choice = response.choices[0]
      const message = choice?.message

      const usage: AIUsageMetadata = {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        latencyMs,
        model: options.model,
      }

      // Check if model emitted a function call
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0]
        if (toolCall.type === "function") {
          let parsedArgs: Record<string, unknown> = {}
          try {
            parsedArgs = JSON.parse(toolCall.function.arguments || "{}")
          } catch {
            console.warn(`Failed to parse tool call args: ${toolCall.function.arguments}`)
          }

          const functionCall: AiFunctionCall = {
            name: toolCall.function.name,
            args: parsedArgs,
          }

          return {
            functionCall,
            rawParts: [{ tool_call: toolCall }],
            usage,
          }
        }
      }

      // Plain text response
      return {
        text: message?.content ?? "",
        usage,
      }
    } catch (err: any) {
      const status = err?.status || err?.statusCode || 500
      if (provider === "groq" && (status === 404 || status === 413 || status === 429) && options.model !== "qwen/qwen3.8-27b") {
        return this.generateWithTools(input, { ...options, model: "qwen/qwen3.8-27b" })
      }
      throw new LLMProviderError(
        `[${provider.toUpperCase()}] Tool Generation Error (${options.model}): ${err.message || String(err)}`,
        status,
        provider
      )
    }
  }

  isAvailable(provider: "openai" | "groq"): boolean {
    const key =
      provider === "groq"
        ? process.env.GROQ_API_KEY
        : process.env.OPENAI_API_KEY
    return Boolean(key && key.length > 10 && !key.includes("your_"))
  }
}

export const openaiGroqClient = new OpenAIGroqClient()
