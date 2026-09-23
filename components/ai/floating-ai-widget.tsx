"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { 
  Sparkles, 
  Bot, 
  X, 
  Send, 
  Maximize2, 
  Minimize2, 
  User, 
  CornerDownLeft,
  ChevronUp,
  MessageSquare
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { DEFAULT_MODEL } from "@/lib/ai/types"
import { FormattedMessage } from "@/components/ai/formatted-message"

interface FloatingMessage {
  id: string
  role: "user" | "model"
  content: string
}

export function FloatingAiWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState<FloatingMessage[]>([
    {
      id: "welcome",
      role: "model",
      content: "Hi there! I'm Aura. Ask me anything about your finances, fitness, meals, notes, or routine!",
    },
  ])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen, isMinimized])

  // Don't render if already on dedicated chat page or auth pages
  if (pathname?.startsWith("/dashboard/chat") || pathname?.startsWith("/auth")) {
    return null
  }

  const handleSend = async (quickText?: string) => {
    const query = (quickText || input).trim()
    if (!query || isLoading) return

    setInput("")
    const userMsg: FloatingMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: query,
    }

    const updated = [...messages, userMsg]
    setMessages(updated)
    setIsLoading(true)

    try {
      // Send last 6 messages
      const payloadMessages = updated.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const selectedModel = typeof window !== "undefined"
        ? localStorage.getItem("aura360_selected_ai_model") || DEFAULT_MODEL
        : DEFAULT_MODEL

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: payloadMessages,
          model: selectedModel,
        }),
      })

      if (!res.ok) {
        throw new Error("Unable to connect to Aura")
      }

      const data = await res.json()
      setMessages(prev => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "model",
          content: data.reply || "I didn't receive a response.",
        },
      ])
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "model",
          content: "Sorry, I had trouble connecting. You can try opening the full AI page.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* ── Docked Chat Window ── */}
      {isOpen && (
        <div
          className={cn(
            "mb-3 w-[92vw] sm:w-[380px] bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-violet-500/20 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 ease-out flex flex-col",
            isMinimized ? "h-14" : "h-[490px] max-h-[80vh]"
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-700 text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-white/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="font-semibold text-xs tracking-wide">Aura Assistant</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/15 text-white/90">AI</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => router.push("/dashboard/chat")}
                className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white"
                title="Expand to Full Page"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/80 hover:text-white"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs no-scrollbar">
                {messages.map((m) => {
                  const isUser = m.role === "user"
                  return (
                    <div
                      key={m.id}
                      className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
                    >
                      {!isUser && (
                        <div className="h-6 w-6 rounded-md bg-violet-600/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <div
                        className={cn(
                          "px-3.5 py-2.5 rounded-2xl max-w-[85%] leading-relaxed text-xs",
                          isUser
                            ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-xs shadow-xs"
                            : "bg-card/95 dark:bg-card/80 border border-border/80 text-foreground rounded-tl-xs shadow-2xs"
                        )}
                      >
                        {isUser ? (
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                        ) : (
                          <FormattedMessage content={m.content} className="text-xs" />
                        )}
                      </div>
                      {isUser && (
                        <div className="h-6 w-6 rounded-md bg-muted border flex items-center justify-center text-muted-foreground shrink-0 mt-0.5">
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  )
                })}

                {isLoading && (
                  <div className="flex gap-2 justify-start items-center text-muted-foreground">
                    <div className="h-6 w-6 rounded-md bg-violet-600/10 text-violet-600 flex items-center justify-center shrink-0">
                      <Sparkles className="h-3 w-3 animate-spin" />
                    </div>
                    <div className="bg-muted/70 rounded-xl px-3 py-2 text-[11px] italic">
                      Aura is typing...
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>

              {/* Quick suggestions */}
              <div className="px-3 py-1.5 border-t bg-muted/20 flex gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => handleSend("Give me a quick productivity tip for today")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full border bg-background/80 hover:bg-violet-500/10 hover:border-violet-500/30 text-[11px] text-muted-foreground hover:text-foreground transition-all shrink-0"
                >
                  ⚡ Productivity tip
                </button>
                <button
                  onClick={() => handleSend("How can I organize my tasks today?")}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full border bg-background/80 hover:bg-violet-500/10 hover:border-violet-500/30 text-[11px] text-muted-foreground hover:text-foreground transition-all shrink-0"
                >
                  📝 Plan day
                </button>
              </div>

              {/* Input box */}
              <div className="p-2.5 border-t bg-card/90">
                <div className="flex items-center gap-1.5 bg-muted/50 border rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-violet-500/20">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Aura anything..."
                    className="flex-1 bg-transparent text-xs py-1.5 focus:outline-hidden placeholder:text-muted-foreground/60"
                    disabled={isLoading}
                  />
                  <Button
                    size="icon"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    className="h-7 w-7 rounded-lg bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-xs"
                  >
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Trigger Button ── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setIsMinimized(false)
        }}
        className={cn(
          "group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-lg shadow-violet-500/25 transition-all duration-300 hover:scale-105 active:scale-95",
          "bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 text-white font-medium text-xs border border-white/20"
        )}
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-violet-600" />
        </div>
        <span className="hidden sm:inline-block tracking-wide">Ask Aura</span>
        <span className="sm:hidden text-[10px] font-bold">AI</span>
      </button>
    </div>
  )
}
