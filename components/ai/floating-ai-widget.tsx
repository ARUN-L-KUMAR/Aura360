"use client"

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { 
  Bot, 
  X, 
  Send, 
  Maximize2, 
  Minus, 
  User, 
  CornerDownLeft,
  ChevronUp,
  MessageSquare,
  Check,
  AlertCircle,
  Wrench,
  Loader2,
  History,
  Plus,
  Trash2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { DEFAULT_MODEL, CHAT_MODELS, type AIModel } from "@/lib/ai/types"
import { FormattedMessage } from "@/components/ai/formatted-message"
import { AiCommandPalette, type AICommand } from "@/components/ai/ai-command-palette"
import { usePageContext } from "@/lib/context/page-context"

export interface FloatingMessage {
  id: string
  role: "user" | "model"
  content: string
  createdAt?: string
  source?: "ai" | "fallback" | "agent"
  trace?: { tool: string; args: unknown }[]
  pendingAction?: {
    tool: string
    args: Record<string, any>
    summary: string
  }
  actionStatus?: "pending" | "confirmed" | "cancelled"
  isStreaming?: boolean
  activeTool?: {
    tool: string
    status: "running" | "completed"
    label: string
  }
}

export interface Thread {
  id: string
  title: string
  messages: FloatingMessage[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "aura360_ai_threads_v1"
const ACTIVE_THREAD_KEY = "aura360_ai_active_thread_v1"

function formatToolLabel(tool: string, status: "running" | "completed"): string {
  const toolDescriptions: Record<string, string> = {
    get_transactions: "Checking transactions...",
    get_budgets: "Checking budgets...",
    get_financial_goals: "Checking goals...",
    get_balances: "Checking balances...",
    get_fitness_logs: "Checking workouts...",
    get_food_logs: "Checking meals...",
    get_notes: "Searching notes...",
    get_wardrobe: "Checking wardrobe...",
    get_wishlist: "Checking wishlist...",
    get_skincare_routine: "Reviewing routine...",
    get_time_logs: "Checking time logs...",
    get_saved_items: "Searching saved...",
    create_transaction: "Recording transaction...",
    create_budget: "Setting budget...",
    log_workout: "Logging workout...",
    log_meal: "Logging meal...",
    create_note: "Creating note...",
    update_note: "Updating note...",
    add_fashion_item: "Adding fashion...",
    get_product_from_link: "Reading the link...",
    add_fashion_item_from_link: "Adding the product...",
    get_fashion_profile: "Checking your fit profile...",
    add_skincare_product: "Adding skincare product...",
    save_item: "Saving item...",
    log_time_entry: "Logging time...",
  }

  const desc = toolDescriptions[tool] || `Running ${tool}...`
  if (status === "completed") {
    return desc
      .replace("...", "")
      .replace("Checking", "Checked")
      .replace("Searching", "Searched")
      .replace("Reviewing", "Reviewed")
      .replace("Recording", "Recorded")
      .replace("Setting", "Set")
      .replace("Logging", "Logged")
      .replace("Creating", "Created")
      .replace("Updating", "Updated")
      .replace("Adding", "Added")
  }
  return desc
}

type AssistantTab = "chat" | "for_you" | "drafts" | "history"

export function FloatingAiWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const pageContext = usePageContext()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeTab, setActiveTab] = useState<AssistantTab>("chat")
  const [input, setInput] = useState("")
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load threads from shared storage
  const loadStoredThreads = () => {
    try {
      if (typeof window === "undefined") return
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Thread[] = JSON.parse(stored)
        setThreads(parsed)
        const storedActiveId = localStorage.getItem(ACTIVE_THREAD_KEY)
        if (storedActiveId && parsed.some((t) => t.id === storedActiveId)) {
          setActiveThreadId(storedActiveId)
        } else if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id)
        }
      }
    } catch {
      // Fallback silently
    }
  }

  // Sync threads and model on mount and open
  useEffect(() => {
    loadStoredThreads()

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("aura360_selected_ai_model") as AIModel
      if (saved && CHAT_MODELS.some((m) => m.id === saved)) {
        setSelectedModel(saved)
      } else if (saved) {
        localStorage.setItem("aura360_selected_ai_model", DEFAULT_MODEL)
        setSelectedModel(DEFAULT_MODEL)
      }
    }

    const handleSync = () => loadStoredThreads()
    window.addEventListener("aura360_threads_updated", handleSync)
    window.addEventListener("storage", handleSync)
    return () => {
      window.removeEventListener("aura360_threads_updated", handleSync)
      window.removeEventListener("storage", handleSync)
    }
  }, [isOpen])

  // Save threads to shared storage
  const saveThreads = (updatedThreads: Thread[], newActiveId?: string) => {
    setThreads(updatedThreads)
    if (newActiveId) {
      setActiveThreadId(newActiveId)
      localStorage.setItem(ACTIVE_THREAD_KEY, newActiveId)
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedThreads))
      window.dispatchEvent(new Event("aura360_threads_updated"))
    } catch {}
  }

  // Active thread and current messages
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0]
  const currentMessages = activeThread?.messages || []

  // Auto-scroll on message updates
  useEffect(() => {
    if (isOpen && !isMinimized && activeTab === "chat") {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [currentMessages, isOpen, isMinimized, activeTab])

  // Toggle command palette on leading slash
  useEffect(() => {
    if (input.startsWith("/")) {
      setShowCommandPalette(true)
    } else if (showCommandPalette) {
      setShowCommandPalette(false)
    }
  }, [input, showCommandPalette])

  // Create new conversation
  const createNewThread = () => {
    const newThread: Thread = {
      id: `thread_${Date.now()}`,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [newThread, ...threads]
    saveThreads(updated, newThread.id)
    setActiveTab("chat")
    toast.success("Started new conversation")
  }

  // Delete conversation
  const deleteThread = (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation()
    const filtered = threads.filter((t) => t.id !== threadId)
    let nextActiveId = activeThreadId
    if (activeThreadId === threadId) {
      nextActiveId = filtered[0]?.id || ""
    }
    saveThreads(filtered, nextActiveId)
    toast.success("Conversation removed")
  }

  // SSE Stream Consumer
  const consumeStream = async (response: Response, aiMessageId: string, targetThreadId: string) => {
    if (!response.body) throw new Error("No response stream available")

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    let accumulatedContent = ""
    let activeTool: { tool: string; status: "running" | "completed"; label: string } | undefined = undefined
    let trace: { tool: string; args: unknown }[] = []
    let pendingAction: any = undefined
    let actionStatus: "pending" | "confirmed" | "cancelled" | undefined = undefined

    const updateMsgInState = (patch: Partial<FloatingMessage>) => {
      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== targetThreadId) return t
          return {
            ...t,
            messages: t.messages.map((m) => (m.id === aiMessageId ? { ...m, ...patch } : m)),
          }
        })
      )
    }

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split("\n\n")
        buffer = chunks.pop() || ""

        for (const chunk of chunks) {
          if (!chunk.trim()) continue
          const lines = chunk.split("\n")
          let eventType = "message"
          let dataStr = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith("data: ")) {
              dataStr = line.slice(6).trim()
            }
          }

          if (!dataStr) continue
          try {
            const payload = JSON.parse(dataStr)
            if (eventType === "tool_call_started") {
              activeTool = {
                tool: payload.tool,
                status: "running",
                label: formatToolLabel(payload.tool, "running"),
              }
              trace = [...trace, { tool: payload.tool, args: payload.args }]
              updateMsgInState({ activeTool, trace })
            } else if (eventType === "tool_call_result") {
              activeTool = {
                tool: payload.tool,
                status: "completed",
                label: formatToolLabel(payload.tool, "completed"),
              }
              updateMsgInState({ activeTool })
            } else if (eventType === "pending_action") {
              pendingAction = payload
              actionStatus = "pending"
              updateMsgInState({ pendingAction, actionStatus: "pending" })
            } else if (eventType === "text_delta") {
              accumulatedContent += payload.delta
              updateMsgInState({ content: accumulatedContent })
            } else if (eventType === "done") {
              accumulatedContent = accumulatedContent || payload.reply || ""
              trace = payload.trace || trace
              pendingAction = payload.pendingAction || pendingAction
              actionStatus = pendingAction ? "pending" : undefined
              updateMsgInState({
                content: accumulatedContent,
                trace,
                pendingAction,
                actionStatus,
                isStreaming: false,
                activeTool: undefined,
              })
            } else if (eventType === "error") {
              throw new Error(payload.message || "Streaming error")
            }
          } catch (err: any) {
            if (eventType === "error") throw err
            console.warn("Widget SSE parse error:", err)
          }
        }
      }
    } finally {
      // Commit final result to localStorage
      setThreads((prev) => {
        const next = prev.map((t) => {
          if (t.id !== targetThreadId) return t
          return {
            ...t,
            updatedAt: new Date().toISOString(),
            messages: t.messages.map((m) =>
              m.id === aiMessageId
                ? {
                    ...m,
                    content: accumulatedContent || "Done.",
                    trace,
                    pendingAction,
                    actionStatus,
                    isStreaming: false,
                    activeTool: undefined,
                  }
                : m
            ),
          }
        })
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          window.dispatchEvent(new Event("aura360_threads_updated"))
        } catch {}
        return next
      })
    }
  }

  // Handle Send text message
  const handleSend = async (quickText?: string) => {
    const query = (quickText || input).trim()
    if (!query || isLoading) return

    setInput("")
    setActiveTab("chat")

    const userMsg: FloatingMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    }

    const aiMsgId = `ai_${Date.now()}`
    const placeholderAi: FloatingMessage = {
      id: aiMsgId,
      role: "model",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
      trace: [],
    }

    let targetThread = activeThread
    let nextThreads = [...threads]

    if (!targetThread) {
      targetThread = {
        id: `thread_${Date.now()}`,
        title: query.slice(0, 36) + (query.length > 36 ? "..." : ""),
        messages: [userMsg, placeholderAi],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      nextThreads = [targetThread, ...nextThreads]
      saveThreads(nextThreads, targetThread.id)
    } else {
      const isFirst = targetThread.messages.length === 0
      const newTitle = isFirst ? query.slice(0, 36) + (query.length > 36 ? "..." : "") : targetThread.title
      const newMessages = [...targetThread.messages, userMsg, placeholderAi]
      targetThread = {
        ...targetThread,
        title: newTitle,
        messages: newMessages,
        updatedAt: new Date().toISOString(),
      }
      nextThreads = nextThreads.map((t) => (t.id === targetThread!.id ? targetThread! : t))
      saveThreads(nextThreads, targetThread.id)
    }

    setIsLoading(true)

    try {
      const payloadMessages = targetThread.messages
        .filter((m) => m.id !== aiMsgId)
        .slice(-8)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }))

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: payloadMessages,
          model: selectedModel,
          pageContext: pageContext.context,
          stream: true,
        }),
      })

      if (!res.ok) {
        throw new Error("Unable to connect to Aura")
      }

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream")) {
        await consumeStream(res, aiMsgId, targetThread.id)
      } else {
        const data = await res.json()
        setThreads((prev) => {
          const next = prev.map((t) => {
            if (t.id !== targetThread!.id) return t
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === aiMsgId
                  ? {
                      ...m,
                      content: data.reply || "I didn't receive a response.",
                      pendingAction: data.pendingAction,
                      actionStatus: data.pendingAction ? ("pending" as const) : undefined,
                      isStreaming: false,
                    }
                  : m
              ),
            }
          })
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            window.dispatchEvent(new Event("aura360_threads_updated"))
          } catch {}
          return next
        })
      }
    } catch (err: any) {
      setThreads((prev) => {
        const next = prev.map((t) => {
          if (t.id !== targetThread!.id) return t
          return {
            ...t,
            messages: t.messages.map((m) =>
              m.id === aiMsgId
                ? {
                    ...m,
                    content: "Sorry, I had trouble connecting. You can try opening the full AI page.",
                    isStreaming: false,
                  }
                : m
            ),
          }
        })
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
          window.dispatchEvent(new Event("aura360_threads_updated"))
        } catch {}
        return next
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Confirmed Tool Action
  const handleConfirmAction = async (
    msgId: string,
    action: { tool: string; args: Record<string, any> },
    targetThreadId?: string
  ) => {
    const threadId = targetThreadId || activeThreadId
    const currentTargetThread = threads.find((t) => t.id === threadId) || activeThread
    if (isLoading || !currentTargetThread) return

    if (threadId !== activeThreadId) {
      setActiveThreadId(threadId)
      try {
        localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
      } catch {}
    }
    setActiveTab("chat")

    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== threadId) return t
        return {
          ...t,
          messages: t.messages.map((m) => (m.id === msgId ? { ...m, actionStatus: "confirmed" as const } : m)),
        }
      })
      return next
    })

    const confirmAiId = `ai_${Date.now()}`
    const placeholderConfirm: FloatingMessage = {
      id: confirmAiId,
      role: "model",
      content: "",
      createdAt: new Date().toISOString(),
      isStreaming: true,
      trace: [],
    }

    const nextMessages = [...currentTargetThread.messages, placeholderConfirm]
    const updatedThread = { ...currentTargetThread, messages: nextMessages }
    const updatedThreads = threads.map((t) => (t.id === threadId ? updatedThread : t))
    saveThreads(updatedThreads, threadId)

    setIsLoading(true)

    try {
      const payloadMessages = currentTargetThread.messages.slice(-8).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          confirm: action,
          model: selectedModel,
          pageContext: pageContext.context,
          stream: true,
        }),
      })

      if (!res.ok) throw new Error("Failed to execute confirmed action")

      const contentType = res.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream")) {
        await consumeStream(res, confirmAiId, threadId)
      } else {
        const data = await res.json()
        setThreads((prev) => {
          const next = prev.map((t) => {
            if (t.id !== threadId) return t
            return {
              ...t,
              messages: t.messages.map((m) =>
                m.id === confirmAiId
                  ? {
                      ...m,
                      content: data.reply || "Action completed successfully.",
                      isStreaming: false,
                    }
                  : m
              ),
            }
          })
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            window.dispatchEvent(new Event("aura360_threads_updated"))
          } catch {}
          return next
        })
      }
      toast.success("Action executed successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm action")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Cancelled Tool Action
  const handleCancelAction = (msgId: string, targetThreadId?: string) => {
    const threadId = targetThreadId || activeThreadId
    setThreads((prev) => {
      const next = prev.map((t) => {
        if (t.id !== threadId) return t
        return {
          ...t,
          messages: t.messages.map((m) => (m.id === msgId ? { ...m, actionStatus: "cancelled" as const } : m)),
        }
      })
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        window.dispatchEvent(new Event("aura360_threads_updated"))
      } catch {}
      return next
    })
    toast.info("Action cancelled")
  }



  const handleSelectCommand = (cmd: AICommand) => {
    setShowCommandPalette(false)
    if (cmd.id === "clear") {
      createNewThread()
      setInput("")
      toast.success("Started a new conversation")
      return
    }

    if (cmd.requiresArgs) {
      setInput(cmd.promptTemplate)
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
          inputRef.current.setSelectionRange(cmd.promptTemplate.length, cmd.promptTemplate.length)
        }
      }, 50)
    } else {
      setInput("")
      handleSend(cmd.promptTemplate)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showCommandPalette && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) {
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      handleSend()
    }
  }

  // Pending Drafts across all threads awaiting review
  const pendingDrafts = threads.flatMap((t) =>
    t.messages
      .filter((m) => m.pendingAction && m.actionStatus === "pending")
      .map((m) => ({
        messageId: m.id,
        threadId: t.id,
        threadTitle: t.title,
        pendingAction: m.pendingAction!,
        createdAt: m.createdAt,
      }))
  )

  const forYouItems = [
    {
      id: "fy-1",
      title: "Weekly Financial Summary",
      desc: "Analyze your income vs expense pacing for this month.",
      prompt: "Review my recent transactions and tell me if any budget category is exceeded.",
      tag: "Finance",
      icon: "💰",
    },
    {
      id: "fy-2",
      title: "Fitness & Activity Streak",
      desc: "Check today's workout goals and log completed exercises.",
      prompt: "Check my recent workouts and suggest a 30-minute training routine for today.",
      tag: "Fitness",
      icon: "🏋️",
    },
    {
      id: "fy-3",
      title: "Quick Daily Capture",
      desc: "Draft a note capturing your main wins and priorities for today.",
      prompt: "Help me write a concise daily recap note with key highlights.",
      tag: "Productivity",
      icon: "📝",
    },
    {
      id: "fy-4",
      title: "Night Routine & Self Care",
      desc: "Verify your evening skincare sequence and bedtime habits.",
      prompt: "Review my evening skincare routine and give me quick tips.",
      tag: "Self Care",
      icon: "✨",
    },
  ]

  const handleSelectForYou = (prompt: string) => {
    setActiveTab("chat")
    handleSend(prompt)
  }

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId)
    try {
      localStorage.setItem(ACTIVE_THREAD_KEY, threadId)
    } catch {}
    setActiveTab("chat")
  }

  const handleNewChat = () => {
    createNewThread()
    setActiveTab("chat")
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* ── Docked Chat Window ── */}
      {isOpen && (
        <div
          className={cn(
            "mb-3 w-[94vw] sm:w-[420px] bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl overflow-hidden transition-all duration-200 ease-out flex flex-col",
            isMinimized ? "h-14" : "h-[540px] max-h-[85vh]"
          )}
        >
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-card border-b border-border text-foreground flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-xs tracking-wide truncate block max-w-[170px]" title="Aura Assistant">
                  Aura Assistant
                </span>
                {/* Active Page Context Indicator */}
                <div
                  className="flex items-center gap-1 text-[10px] text-muted-foreground/80 truncate"
                  title={`Working on ${pageContext.context?.pageTitle || "dashboard"}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate max-w-[160px]">
                    Working on {pageContext.context?.pageTitle?.toLowerCase() || "dashboard"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* New Conversation Button */}
              <button
                onClick={handleNewChat}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="New Chat"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>

              {/* Expand to Full Page */}
              <button
                onClick={() => {
                  if (activeThreadId) {
                    localStorage.setItem(ACTIVE_THREAD_KEY, activeThreadId)
                  }
                  router.push("/dashboard/chat")
                }}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Expand to Full Page"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              {/* Minimize / Restore */}
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? <ChevronUp className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* ── Tabs Navigation ── */}
              <div className="flex items-center border-b border-border/70 bg-muted/20 px-3 text-xs shrink-0">
                <button
                  onClick={() => setActiveTab("chat")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
                    activeTab === "chat"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab("for_you")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
                    activeTab === "for_you"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  For you
                  <span className="h-4 min-w-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none shadow-2xs">
                    2
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab("drafts")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
                    activeTab === "drafts"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Drafts
                  {pendingDrafts.length > 0 && (
                    <span className="h-4 min-w-4 px-1 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center leading-none shadow-2xs">
                      {pendingDrafts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "px-3 py-2 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
                    activeTab === "history"
                      ? "border-primary text-primary font-semibold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  History
                </button>
              </div>

              {/* ── Tab: DRAFTS ── */}
              {activeTab === "drafts" && (
                <div className="flex-1 overflow-y-auto p-4 no-scrollbar flex flex-col">
                  {pendingDrafts.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto">
                      <div className="h-16 w-16 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground/70 mb-3 shadow-2xs">
                        <Check className="h-8 w-8 stroke-[2.5]" />
                      </div>
                      <h4 className="font-semibold text-sm text-foreground mb-1.5">
                        Nothing waiting for review
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[270px]">
                        When the assistant drafts a message or announcement, it lands here for you to approve before anyone sees it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-1 border-b border-border/60">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Pending Approval ({pendingDrafts.length})
                        </span>
                        <span className="text-[10px] text-amber-500 font-medium">Review Required</span>
                      </div>
                      {pendingDrafts.map((draft) => (
                        <div
                          key={draft.messageId}
                          className="p-3 rounded-xl border border-amber-500/40 bg-card shadow-xs space-y-2.5 transition-all hover:border-amber-500/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span className="font-mono text-[11px] capitalize">
                                {draft.pendingAction.tool.replace(/_/g, " ")}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/70 truncate max-w-[120px]">
                              {draft.threadTitle}
                            </span>
                          </div>

                          <p className="text-xs font-medium text-foreground leading-snug">
                            {draft.pendingAction.summary}
                          </p>

                          {draft.pendingAction.args && Object.keys(draft.pendingAction.args).length > 0 && (
                            <div className="bg-muted/40 rounded-lg p-2 text-[11px] font-mono space-y-1 border border-border/40">
                              {Object.entries(draft.pendingAction.args).slice(0, 4).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2">
                                  <span className="text-muted-foreground truncate">{k}:</span>
                                  <span className="text-foreground font-semibold truncate max-w-[180px]">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/40">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isLoading}
                              onClick={() => handleCancelAction(draft.messageId, draft.threadId)}
                              className="h-7 text-xs px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleConfirmAction(draft.messageId, draft.pendingAction, draft.threadId)}
                              className="h-7 text-xs px-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-xs flex items-center gap-1.5"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: FOR YOU ── */}
              {activeTab === "for_you" && (
                <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 no-scrollbar">
                  <div className="flex items-center justify-between px-1 pb-1">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Recommended For You
                    </span>
                    <span className="text-[10px] text-muted-foreground">Proactive Insights</span>
                  </div>

                  {forYouItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectForYou(item.prompt)}
                      className="group p-3 rounded-xl border border-border/70 bg-card/60 hover:bg-accent/40 hover:border-primary/40 transition-all cursor-pointer shadow-2xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{item.icon}</span>
                          <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed pl-6">
                        {item.desc}
                      </p>
                      <div className="flex items-center justify-end pt-1">
                        <span className="text-[10px] font-medium text-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Ask Assistant →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tab: HISTORY ── */}
              {activeTab === "history" && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 no-scrollbar">
                  <div className="flex items-center justify-between px-1 pb-2 border-b border-border/60">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Previous Conversations ({threads.length})
                    </span>
                    <button
                      onClick={handleNewChat}
                      className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      New Chat
                    </button>
                  </div>

                  {threads.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      No previous conversations found.
                    </div>
                  ) : (
                    threads.map((t) => {
                      const isActive = t.id === activeThreadId
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleSelectThread(t.id)}
                          className={cn(
                            "group/item flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all text-xs",
                            isActive
                              ? "bg-primary/10 border-primary/30 text-foreground font-medium shadow-xs"
                              : "bg-card/50 hover:bg-muted/80 border-border/60 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs leading-tight">{t.title || "New Conversation"}</p>
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                {t.messages.length} {t.messages.length === 1 ? "message" : "messages"}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={(e) => deleteThread(e, t.id)}
                            className="p-1 rounded-md opacity-0 group-hover/item:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all text-muted-foreground"
                            title="Delete conversation"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* ── Tab: CHAT ── */}
              {activeTab === "chat" && (
                <>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs no-scrollbar">
                    {currentMessages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center p-3 text-center my-auto">
                        <div className="relative mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary/20 via-violet-500/20 to-emerald-500/20 border border-primary/30 shadow-lg backdrop-blur-md">
                          <Bot className="h-6 w-6 text-primary animate-pulse" />
                        </div>
                        <h4 className="font-semibold text-sm tracking-tight text-foreground mb-1">
                          Aura Generative AI Studio
                        </h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[260px] mb-4">
                          Generate live, interactive widgets you can launch, adjust, or commit directly.
                        </p>

                        {/* Interactive Generative Action Cards */}
                        <div className="w-full space-y-2 text-left">
                          {[
                            {
                              label: "🏋️ Design a 45-min Push Workout",
                              desc: "Interactive exercise sets with 1-click live launch",
                              prompt: "Design a 45-minute intermediate push routine for chest and triceps with exercises, reps, and weights.",
                              border: "hover:border-violet-500/40 hover:bg-violet-500/5",
                            },
                            {
                              label: "🥗 Plan High-Protein Fuel Recipe",
                              desc: "Macro breakdown with 1-click database food logging",
                              prompt: "Give me a high-protein dinner meal recipe with full macros and ingredients that I can log.",
                              border: "hover:border-emerald-500/40 hover:bg-emerald-500/5",
                            },
                            {
                              label: "💰 Create 50/30/20 Budget Blueprint",
                              desc: "Interactive category percentage sliders",
                              prompt: "Create a 50/30/20 budget allocation for $4,500 monthly income with category sliders.",
                              border: "hover:border-amber-500/40 hover:bg-amber-500/5",
                            },
                            {
                              label: "👔 Curate Autumn Smart Casual Outfit",
                              desc: "Capsule lookbook with color swatches & diary logging",
                              prompt: "Curate a smart casual autumn layered outfit capsule with color palette hex codes.",
                              border: "hover:border-purple-500/40 hover:bg-purple-500/5",
                            },
                          ].map((chip, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSend(chip.prompt)}
                              className={cn(
                                "w-full p-2.5 rounded-xl border border-border/60 bg-card/60 transition-all text-xs group block",
                                chip.border
                              )}
                            >
                              <div className="font-medium text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                                <span>{chip.label}</span>
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-primary">
                                  Generate →
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                {chip.desc}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentMessages.map((m) => {
                      const isUser = m.role === "user"
                      return (
                        <div
                          key={m.id}
                          className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}
                        >
                          {!isUser && (
                            <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div
                            className={cn(
                              "px-3.5 py-2.5 rounded-2xl max-w-[85%] leading-relaxed text-xs",
                              isUser
                                ? "bg-primary text-primary-foreground rounded-tr-xs shadow-xs"
                                : "bg-card border border-border text-foreground rounded-tl-xs shadow-2xs"
                            )}
                          >
                            {isUser ? (
                              <div className="whitespace-pre-wrap break-words">{m.content}</div>
                            ) : (
                              <div className="space-y-1.5">
                                {m.activeTool && (
                                  <div className="mb-1 inline-flex items-center gap-1.5 text-[10px] font-medium text-foreground bg-secondary border border-border rounded-md px-2 py-0.5">
                                    {m.activeTool.status === "running" ? (
                                      <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />
                                    ) : (
                                      <Check className="h-2.5 w-2.5 text-emerald-500" />
                                    )}
                                    <span>{m.activeTool.label}</span>
                                  </div>
                                )}

                                {m.content ? (
                                  <FormattedMessage content={m.content} className="text-xs" />
                                ) : (
                                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground italic py-0.5">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce" />
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.2s]" />
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0.4s]" />
                                    <span className="ml-1 text-[10px]">Aura is thinking...</span>
                                  </div>
                                )}

                                {/* Pending Confirmation Gate */}
                                {m.pendingAction && m.actionStatus === "pending" && (
                                  <div className="mt-2 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 dark:bg-amber-950/20 text-foreground space-y-2">
                                    <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                      <span>Confirmation Required</span>
                                    </div>
                                    <p className="text-[11px] leading-relaxed">
                                      {m.pendingAction.summary}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1">
                                      <Button
                                        size="sm"
                                        disabled={isLoading}
                                        onClick={() => handleConfirmAction(m.id, m.pendingAction!)}
                                        className="h-6 text-[10px] px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md shadow-xs"
                                      >
                                        Confirm
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        disabled={isLoading}
                                        onClick={() => handleCancelAction(m.id)}
                                        className="h-6 text-[10px] px-2.5 text-muted-foreground hover:text-foreground rounded-md"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}

                                {m.actionStatus === "confirmed" && (
                                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    <Check className="h-3 w-3" />
                                    <span>Action confirmed</span>
                                  </div>
                                )}

                                {m.actionStatus === "cancelled" && (
                                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground italic">
                                    <X className="h-3 w-3" />
                                    <span>Action cancelled</span>
                                  </div>
                                )}

                                {/* Tool Call Pills */}
                                {m.trace && m.trace.length > 0 && !m.activeTool && (
                                  <div className="flex flex-wrap gap-1 pt-1">
                                    {m.trace.map((t, idx) => (
                                      <span
                                        key={idx}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/80 font-mono"
                                      >
                                        ✓ {t.tool}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {isLoading && !currentMessages.some((m) => m.isStreaming) && (
                      <div className="flex gap-2 justify-start items-center text-muted-foreground">
                        <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <Bot className="h-3 w-3" />
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
                      onClick={() => handleSend("Review my recent transactions and balances")}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full border bg-background/80 hover:bg-accent hover:border-border text-[11px] text-muted-foreground hover:text-foreground transition-all shrink-0"
                    >
                      💰 Check balances
                    </button>
                    <button
                      onClick={() => handleSend("How can I organize my day productively?")}
                      className="whitespace-nowrap px-2.5 py-1 rounded-full border bg-background/80 hover:bg-accent hover:border-border text-[11px] text-muted-foreground hover:text-foreground transition-all shrink-0"
                    >
                      📝 Plan day
                    </button>
                  </div>

                  {/* Input box & bottom toolbar */}
                  <div className="p-2.5 border-t bg-card/90 relative">
                    {/* AI Command Palette */}
                    <AiCommandPalette
                      query={input}
                      isOpen={showCommandPalette}
                      onClose={() => setShowCommandPalette(false)}
                      onSelectCommand={handleSelectCommand}
                    />

                    <div className="flex items-center gap-1.5 bg-muted/50 border rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-primary/20">
                      <input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask Aura or type / for commands..."
                        className="flex-1 bg-transparent text-xs py-1.5 focus:outline-hidden placeholder:text-muted-foreground/60"
                        disabled={isLoading}
                      />
                      <Button
                        size="icon"
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isLoading}
                        className="h-7 w-7 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs"
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Model Selector in Bottom */}
                    <div className="flex items-center justify-between mt-2 pt-0.5 px-0.5">
                      <Select
                        value={selectedModel}
                        onValueChange={(val) => {
                          const next = val as AIModel
                          setSelectedModel(next)
                          try {
                            localStorage.setItem("aura360_selected_ai_model", next)
                          } catch {}
                          const found = CHAT_MODELS.find((m) => m.id === next)
                          toast.success(`Switched model to ${found?.name || next}`)
                        }}
                      >
                        <SelectTrigger
                          size="sm"
                          className="h-6 text-[11px] font-medium bg-transparent border-transparent hover:bg-muted/60 hover:border-border/60 text-muted-foreground hover:text-foreground px-1.5 gap-1.5 shadow-none focus-visible:ring-1"
                        >
                          <Zap className="h-3 w-3 text-amber-500 shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {CHAT_MODELS.find((m) => m.id === selectedModel)?.name || selectedModel}
                          </span>
                        </SelectTrigger>
                        <SelectContent side="top" align="start" className="w-[280px] max-h-[300px] overflow-y-auto">
                          <SelectGroup>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              Groq LPUs
                            </div>
                            {CHAT_MODELS.filter((m) => m.provider === "groq").map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-xs py-1.5 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-medium truncate">{m.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{m.latency}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-1">
                              OpenAI
                            </div>
                            {CHAT_MODELS.filter((m) => m.provider === "openai").map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-xs py-1.5 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-medium truncate">{m.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{m.latency}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-t mt-1 pt-1">
                              Google Gemini
                            </div>
                            {CHAT_MODELS.filter((m) => m.provider === "gemini").map((m) => (
                              <SelectItem key={m.id} value={m.id} className="text-xs py-1.5 cursor-pointer">
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-medium truncate">{m.name}</span>
                                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{m.latency}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>

                      <span className="text-[10px] text-muted-foreground/60 font-mono">
                        {CHAT_MODELS.find((m) => m.id === selectedModel)?.latency || ""}
                      </span>
                    </div>
                  </div>
                </>
              )}
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
          "group relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-full shadow-lg shadow-primary/15 transition-all duration-300 hover:scale-105 active:scale-95",
          "bg-primary text-primary-foreground font-medium text-xs border border-border/40"
        )}
        aria-label="Open AI Assistant"
      >
        <div className="relative">
          <Bot className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
        </div>
        <span className="hidden sm:inline-block tracking-wide">Ask Aura</span>
        <span className="sm:hidden text-[10px] font-bold">AI</span>
      </button>
    </div>
  )
}
