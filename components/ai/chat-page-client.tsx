"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Send, 
  Bot, 
  User, 
  Trash2, 
  Plus, 
  Copy, 
  Check, 
  RefreshCw, 
  Database, 
  ChevronRight,
  MessageSquare,
  AlertCircle,
  Menu,
  X,
  Share2,
  Lightbulb,
  Zap,
  ArrowDown,
  Wrench,
  Loader2,
  Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { CHAT_MODELS, DEFAULT_MODEL, type AIModel } from "@/lib/ai/types"
import { FormattedMessage } from "@/components/ai/formatted-message"
import { AiCommandPalette, type AICommand } from "@/components/ai/ai-command-palette"
import { usePageContext } from "@/lib/context/page-context"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "model"
  content: string
  createdAt: string
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

function formatToolLabel(tool: string, status: "running" | "completed"): string {
  const toolDescriptions: Record<string, string> = {
    get_transactions: "Checking your transactions...",
    get_budgets: "Checking your budgets...",
    get_financial_goals: "Checking savings goals...",
    get_balances: "Checking account balances...",
    get_fitness_logs: "Looking up workout logs...",
    get_food_logs: "Checking food & meal logs...",
    get_notes: "Searching your notes...",
    get_wardrobe: "Checking your wardrobe...",
    get_wishlist: "Checking your wishlist...",
    get_skincare_routine: "Reviewing skincare routine...",
    get_time_logs: "Checking your time logs...",
    get_saved_items: "Searching saved items...",
    create_transaction: "Recording transaction...",
    create_budget: "Setting budget...",
    log_workout: "Logging workout...",
    log_meal: "Logging meal...",
    create_note: "Creating note...",
    update_note: "Updating note...",
    add_fashion_item: "Adding fashion item...",
    log_time_entry: "Logging time entry...",
  }

  const desc = toolDescriptions[tool] || `Executing ${tool}...`
  if (status === "completed") {
    return desc
      .replace("...", "")
      .replace("Checking", "Checked")
      .replace("Looking up", "Checked")
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

interface Thread {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "aura360_ai_threads_v1"
const ACTIVE_THREAD_KEY = "aura360_ai_active_thread_v1"
const MODEL_STORAGE_KEY = "aura360_selected_ai_model"

const SUGGESTED_PROMPTS = [
  {
    category: "Finance",
    icon: "💰",
    prompt: "Review my recent transactions and tell me where I'm spending most.",
  },
  {
    category: "Fitness & Health",
    icon: "🏋️",
    prompt: "Create a balanced 3-day workout routine focusing on core and strength.",
  },
  {
    category: "Productivity",
    icon: "📝",
    prompt: "Give me an actionable morning routine to stay focused and productive.",
  },
  {
    category: "Self Care",
    icon: "💆",
    prompt: "What is an ideal evening skincare sequence for glowing skin?",
  },
  {
    category: "Nutrition",
    icon: "🥗",
    prompt: "Suggest 5 quick high-protein snack ideas under 250 calories.",
  },
  {
    category: "Time Management",
    icon: "⏰",
    prompt: "How can I better prioritize tasks when feeling overwhelmed?",
  },
]

type AssistantTab = "chat" | "for_you" | "drafts" | "history"

export function ChatPageClient() {
  const pageContext = usePageContext()
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<AssistantTab>("chat")
  const [input, setInput] = useState("")
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [includeContext, setIncludeContext] = useState(true)
  const [contextSummary, setContextSummary] = useState<string>("")
  const [hasDataSummary, setHasDataSummary] = useState(false)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [selectedModel, setSelectedModel] = useState<AIModel>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(MODEL_STORAGE_KEY)
        if (saved && CHAT_MODELS.some(m => m.id === saved)) {
          return saved as AIModel
        }
      } catch {}
    }
    return DEFAULT_MODEL
  })
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Load threads from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: Thread[] = JSON.parse(stored)
        setThreads(parsed)
        const storedActiveId = localStorage.getItem(ACTIVE_THREAD_KEY)
        if (storedActiveId && parsed.some(t => t.id === storedActiveId)) {
          setActiveThreadId(storedActiveId)
        } else if (parsed.length > 0) {
          setActiveThreadId(parsed[0].id)
        } else {
          createNewThread()
        }
      } else {
        createNewThread()
      }
    } catch {
      createNewThread()
    }
  }, [])

  // Fetch workspace context summary on mount
  useEffect(() => {
    async function loadContext() {
      try {
        const res = await fetch("/api/ai/context")
        if (res.ok) {
          const data = await res.json()
          setContextSummary(data.context || "")
          setHasDataSummary(Boolean(data.hasData))
        }
      } catch {
        // Fallback silently if context fails
      }
    }
    loadContext()
  }, [])

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [threads, activeThreadId, isLoading])

  // Save threads to localStorage
  const saveThreads = (updatedThreads: Thread[], currentActiveId?: string) => {
    setThreads(updatedThreads)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedThreads))
      if (currentActiveId) {
        localStorage.setItem(ACTIVE_THREAD_KEY, currentActiveId)
      }
    } catch (e) {
      console.error("Failed to save AI threads to localStorage", e)
    }
  }

  const activeThread = threads.find(t => t.id === activeThreadId) || threads[0]

  const createNewThread = () => {
    const newId = `thread_${Date.now()}`
    const newThread: Thread = {
      id: newId,
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [newThread, ...threads]
    setActiveThreadId(newId)
    saveThreads(updated, newId)
    setIsSidebarOpen(false)
  }

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const filtered = threads.filter(t => t.id !== id)
    if (filtered.length === 0) {
      const freshId = `thread_${Date.now()}`
      const freshThread: Thread = {
        id: freshId,
        title: "New Conversation",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      setActiveThreadId(freshId)
      saveThreads([freshThread], freshId)
    } else {
      const nextActiveId = activeThreadId === id ? filtered[0].id : activeThreadId
      setActiveThreadId(nextActiveId)
      saveThreads(filtered, nextActiveId || undefined)
    }
    toast.success("Conversation removed")
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || isLoading || !activeThread) return

    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    }

    const currentMessages = activeThread.messages
    const updatedMessages = [...currentMessages, userMessage]

    // Determine thread title if this is the first message
    const updatedTitle = currentMessages.length === 0 
      ? query.slice(0, 36) + (query.length > 36 ? "..." : "")
      : activeThread.title

    const updatedThread: Thread = {
      ...activeThread,
      title: updatedTitle,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    }

    const nextThreads = threads.map(t => t.id === activeThread.id ? updatedThread : t)
    saveThreads(nextThreads, activeThread.id)
    setIsLoading(true)

    const aiMessageId = `msg_ai_${Date.now()}`
    const placeholderAi: Message = {
      id: aiMessageId,
      role: "model",
      content: "",
      createdAt: new Date().toISOString(),
      source: "agent",
      isStreaming: true,
      trace: [],
    }

    const messagesWithPlaceholder = [...updatedMessages, placeholderAi]
    const threadWithPlaceholder: Thread = {
      ...updatedThread,
      messages: messagesWithPlaceholder,
    }
    const threadsWithPlaceholder = threads.map(t => t.id === activeThread.id ? threadWithPlaceholder : t)
    setThreads(threadsWithPlaceholder)

    try {
      // Prepare payload for /api/ai/chat (role is 'user' | 'model')
      const payloadMessages = updatedMessages.slice(-10).map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          context: includeContext && contextSummary ? contextSummary : undefined,
          model: selectedModel,
          pageContext: pageContext.context,
          stream: true,
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Unable to get response from Aura")
      }

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream")) {
        await consumeAgentStream(response, aiMessageId, activeThread.id)
      } else {
        const data = await response.json()
        const aiReply: Message = {
          id: aiMessageId,
          role: "model",
          content: data.reply || "I'm sorry, I couldn't generate a reply.",
          createdAt: new Date().toISOString(),
          source: data.source,
          trace: data.trace,
          pendingAction: data.pendingAction,
          actionStatus: data.pendingAction ? "pending" : undefined,
          isStreaming: false,
        }

        const finalMessages = [...updatedMessages, aiReply]
        const finalThread: Thread = {
          ...updatedThread,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        }
        const finalizedThreads = threads.map(t => t.id === activeThread.id ? finalThread : t)
        saveThreads(finalizedThreads, activeThread.id)
      }
    } catch (err: any) {
      console.error("AI Chat Error:", err)
      toast.error(err.message || "Failed to reach Aura AI")

      const errorReply: Message = {
        id: aiMessageId,
        role: "model",
        content: `⚠️ ${err.message || "Something went wrong while connecting to the AI assistant. Please check your connection or Gemini API key."}`,
        createdAt: new Date().toISOString(),
        source: "fallback",
        isStreaming: false,
      }

      const finalMessages = [...updatedMessages, errorReply]
      const finalThread: Thread = {
        ...updatedThread,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      }
      const finalizedThreads = threads.map(t => t.id === activeThread.id ? finalThread : t)
      saveThreads(finalizedThreads, activeThread.id)
    } finally {
      setIsLoading(false)
    }
  }

  const consumeAgentStream = async (
    response: Response,
    aiMessageId: string,
    threadId: string
  ) => {
    if (!response.body) {
      throw new Error("No response stream available")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    let accumulatedContent = ""
    let activeTool: { tool: string; status: "running" | "completed"; label: string } | undefined = undefined
    let trace: { tool: string; args: unknown }[] = []
    let pendingAction: any = undefined
    let actionStatus: "pending" | "confirmed" | "cancelled" | undefined = undefined

    const updateMsg = (patch: Partial<Message>) => {
      setThreads((prevThreads) =>
        prevThreads.map((t) => {
          if (t.id !== threadId) return t
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
              updateMsg({ activeTool, trace })
            } else if (eventType === "tool_call_result") {
              activeTool = {
                tool: payload.tool,
                status: "completed",
                label: formatToolLabel(payload.tool, "completed"),
              }
              updateMsg({ activeTool })
            } else if (eventType === "pending_action") {
              pendingAction = payload
              actionStatus = "pending"
              updateMsg({ pendingAction, actionStatus: "pending" })
            } else if (eventType === "text_delta") {
              accumulatedContent += payload.delta
              updateMsg({ content: accumulatedContent })
            } else if (eventType === "done") {
              accumulatedContent = accumulatedContent || payload.reply || ""
              trace = payload.trace || trace
              pendingAction = payload.pendingAction || pendingAction
              actionStatus = pendingAction ? "pending" : undefined
              updateMsg({
                content: accumulatedContent,
                trace,
                pendingAction,
                actionStatus,
                isStreaming: false,
                activeTool: undefined,
              })
            } else if (eventType === "error") {
              throw new Error(payload.message || "Error processing AI request")
            }
          } catch (parseErr: any) {
            if (eventType === "error") throw parseErr
            console.warn("SSE parse error:", parseErr, dataStr)
          }
        }
      }
    } finally {
      // Finalize and save to localStorage
      setThreads((prevThreads) => {
        const next = prevThreads.map((t) => {
          if (t.id !== threadId) return t
          return {
            ...t,
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
        saveThreads(next, threadId)
        return next
      })
    }
  }

  const handleConfirmAction = async (
    msgId: string,
    action: { tool: string; args: Record<string, any> },
    targetThreadId?: string
  ) => {
    const candidateId = targetThreadId || activeThreadId || (activeThread ? activeThread.id : undefined)
    const currentTargetThread = threads.find((t) => t.id === candidateId) || activeThread
    const threadId = candidateId || currentTargetThread?.id
    if (isLoading || !currentTargetThread || !threadId) return

    if (threadId !== activeThreadId) {
      setActiveThreadId(threadId)
    }
    setActiveTab("chat")

    const updatedMessages = currentTargetThread.messages.map((m) =>
      m.id === msgId ? { ...m, actionStatus: "confirmed" as const } : m
    )

    const confirmAiId = `msg_ai_${Date.now()}`
    const placeholderConfirmAi: Message = {
      id: confirmAiId,
      role: "model",
      content: "",
      createdAt: new Date().toISOString(),
      source: "agent",
      isStreaming: true,
      trace: [],
    }

    const updatedThread: Thread = {
      ...currentTargetThread,
      messages: [...updatedMessages, placeholderConfirmAi],
      updatedAt: new Date().toISOString(),
    }
    const nextThreads = threads.map((t) => (t.id === threadId ? updatedThread : t))
    setThreads(nextThreads)
    setIsLoading(true)

    try {
      const payloadMessages = updatedMessages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch("/api/ai/chat", {
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

      if (!response.ok) {
        throw new Error("Failed to execute confirmed action")
      }

      const contentType = response.headers.get("content-type") || ""
      if (contentType.includes("text/event-stream")) {
        await consumeAgentStream(response, confirmAiId, threadId)
      } else {
        const data = await response.json()
        const aiReply: Message = {
          id: confirmAiId,
          role: "model",
          content: data.reply || "Action completed successfully.",
          createdAt: new Date().toISOString(),
          source: data.source,
          trace: data.trace,
          isStreaming: false,
        }

        const finalMessages = [...updatedMessages, aiReply]
        const finalThread: Thread = {
          ...currentTargetThread,
          messages: finalMessages,
          updatedAt: new Date().toISOString(),
        }
        saveThreads(threads.map((t) => (t.id === threadId ? finalThread : t)), threadId)
      }
      toast.success("Action executed successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm action")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelAction = (msgId: string, targetThreadId?: string) => {
    const threadId = targetThreadId || activeThreadId || (activeThread ? activeThread.id : undefined)
    const currentTargetThread = threads.find((t) => t.id === threadId) || activeThread
    if (!currentTargetThread || !threadId) return
    const updatedMessages = currentTargetThread.messages.map((m) =>
      m.id === msgId ? { ...m, actionStatus: "cancelled" as const } : m
    )
    const updatedThread: Thread = {
      ...currentTargetThread,
      messages: updatedMessages,
      updatedAt: new Date().toISOString(),
    }
    saveThreads(threads.map((t) => (t.id === threadId ? updatedThread : t)), threadId)
    toast.info("Action cancelled")
  }

  // Toggle command palette on leading slash
  useEffect(() => {
    if (input.startsWith("/")) {
      setShowCommandPalette(true)
    } else if (showCommandPalette) {
      setShowCommandPalette(false)
    }
  }, [input, showCommandPalette])

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
        if (textareaRef.current) {
          textareaRef.current.focus()
          textareaRef.current.setSelectionRange(cmd.promptTemplate.length, cmd.promptTemplate.length)
        }
      }, 50)
    } else {
      setInput("")
      handleSendMessage(cmd.promptTemplate)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showCommandPalette && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) {
      return
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedMessageId(id)
    toast.success("Copied to clipboard")
    setTimeout(() => setCopiedMessageId(null), 2000)
  }

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch {
      return ""
    }
  }

  const activeModelInfo = CHAT_MODELS.find(m => m.id === selectedModel) || CHAT_MODELS[0]

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
    handleSendMessage(prompt)
  }

  const handleSelectThread = (threadId: string) => {
    setActiveThreadId(threadId)
    setActiveTab("chat")
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 gap-4">
      {/* ── Left Sidebar (Threads) ── */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-card/95 backdrop-blur-md border-r p-4 transition-transform duration-300 lg:static lg:w-72 lg:translate-x-0 lg:rounded-2xl lg:border lg:flex lg:flex-col shadow-sm",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Aura AI</h2>
              <p className="text-[11px] text-muted-foreground">Personal Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="pt-3 pb-2">
          <Button
            onClick={createNewThread}
            className="w-full justify-start gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-medium"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2 pr-1 no-scrollbar">
          {threads.map((thread) => {
            const isActive = thread.id === activeThread?.id
            return (
              <div
                key={thread.id}
                onClick={() => {
                  setActiveThreadId(thread.id)
                  setIsSidebarOpen(false)
                }}
                className={cn(
                  "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-all",
                  isActive ? "bg-secondary text-secondary-foreground font-semibold border border-border shadow-2xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                  <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground/60")} />
                  <span className="truncate">{thread.title || "Untitled Conversation"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                  onClick={(e) => deleteThread(thread.id, e)}
                  title="Delete chat"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* Workspace Context Status Card */}
        <div className="pt-3 border-t mt-auto">
          <div className="bg-muted/40 rounded-xl p-3 border text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Database className="h-3.5 w-3.5 text-primary" />
                Workspace Data
              </span>
              <Switch
                checked={includeContext}
                onCheckedChange={setIncludeContext}
                aria-label="Include workspace context"
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {includeContext 
                ? hasDataSummary 
                  ? "Aura has context on your recent transactions, notes, and activity."
                  : "Active, waiting for module logs."
                : "Context disabled. Aura will answer general queries."}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Chat Area ── */}
      <div className="flex-1 flex flex-col h-full bg-card/60 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-xs relative">
        {/* Top Header */}
        <div className="px-3 sm:px-4 py-3 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 shrink-0"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground flex items-center gap-2 truncate">
                  {activeThread?.title || "Aura Assistant"}
                </h1>
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate">{activeModelInfo.name}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0">({activeModelInfo.latency})</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Model Selector Dropdown */}
            <Select
              value={selectedModel}
              onValueChange={(val) => {
                const nextModel = val as AIModel
                setSelectedModel(nextModel)
                try {
                  localStorage.setItem(MODEL_STORAGE_KEY, nextModel)
                } catch {}
                const found = CHAT_MODELS.find(m => m.id === nextModel)
                toast.success(`Switched model to ${found?.name || nextModel}`)
              }}
            >
              <SelectTrigger size="sm" className="h-8 text-xs font-medium max-w-[155px] sm:max-w-[210px] bg-background/60 border-border/80 shadow-2xs">
                <div className="flex items-center gap-1.5 truncate">
                  <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  <span className="truncate">{activeModelInfo.name}</span>
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="w-[330px] max-h-[420px] overflow-y-auto">
                {/* Groq Models */}
                <SelectGroup>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>⚡ Groq LPUs</span>
                    <span className="text-[10px] lowercase font-normal text-emerald-600 dark:text-emerald-400 font-mono">Ultra Fast</span>
                  </div>
                  {CHAT_MODELS.filter((m) => m.provider === "groq").map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs py-2 cursor-pointer">
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{model.name}</span>
                          <div className="flex items-center gap-1.5">
                            {model.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {model.badge}
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
                              {model.latency}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* OpenAI Models */}
                <SelectGroup className="border-t border-border/60 mt-1 pt-1">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>🌐 OpenAI</span>
                    <span className="text-[10px] lowercase font-normal text-sky-600 dark:text-sky-400 font-mono">GPT-4o & Mini</span>
                  </div>
                  {CHAT_MODELS.filter((m) => m.provider === "openai").map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs py-2 cursor-pointer">
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{model.name}</span>
                          <div className="flex items-center gap-1.5">
                            {model.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {model.badge}
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
                              {model.latency}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>

                {/* Google Gemini Models */}
                <SelectGroup className="border-t border-border/60 mt-1 pt-1">
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>✨ Google Gemini</span>
                    <span className="text-[10px] lowercase font-normal text-amber-600 dark:text-amber-400 font-mono">Multimodal</span>
                  </div>
                  {CHAT_MODELS.filter((m) => m.provider === "gemini").map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs py-2 cursor-pointer">
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{model.name}</span>
                          <div className="flex items-center gap-1.5">
                            {model.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                                {model.badge}
                              </span>
                            )}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
                              {model.latency}
                            </span>
                          </div>
                        </div>
                        <span className="text-[11px] text-muted-foreground leading-snug line-clamp-1">
                          {model.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            {includeContext && (
              <Badge variant="secondary" className="hidden md:inline-flex text-[11px] font-normal gap-1 bg-secondary text-secondary-foreground border-border">
                <Database className="h-3 w-3" />
                Data
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={createNewThread}
              className="h-8 text-xs gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New</span>
            </Button>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex items-center border-b border-border/70 bg-muted/20 px-3 sm:px-4 text-xs shrink-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
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
              "px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
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
              "px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
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
              "px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors relative flex items-center gap-1.5",
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
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar flex flex-col max-w-3xl mx-auto w-full">
            {pendingDrafts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
                <div className="h-16 w-16 rounded-full bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground/70 mb-4 shadow-2xs">
                  <Check className="h-8 w-8 stroke-[2.5]" />
                </div>
                <h3 className="font-semibold text-base text-foreground mb-1.5">
                  Nothing waiting for review
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  When the assistant drafts a message or announcement, it lands here for you to approve before anyone sees it.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Pending Approval ({pendingDrafts.length})
                  </span>
                  <span className="text-xs text-amber-500 font-medium">Review Required</span>
                </div>
                {pendingDrafts.map((draft) => (
                  <div
                    key={draft.messageId}
                    className="p-4 rounded-xl border border-amber-500/40 bg-card shadow-xs space-y-3 transition-all hover:border-amber-500/60"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-xs capitalize">
                          {draft.pendingAction.tool.replace(/_/g, " ")}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground/70 truncate max-w-[200px]">
                        {draft.threadTitle}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-foreground leading-snug">
                      {draft.pendingAction.summary}
                    </p>

                    {draft.pendingAction.args && Object.keys(draft.pendingAction.args).length > 0 && (
                      <div className="bg-muted/40 rounded-lg p-3 text-xs font-mono space-y-1.5 border border-border/40">
                        {Object.entries(draft.pendingAction.args).map(([k, v]) => (
                          <div key={k} className="flex justify-between gap-4">
                            <span className="text-muted-foreground">{k}:</span>
                            <span className="text-foreground font-semibold truncate max-w-[300px]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isLoading}
                        onClick={() => handleCancelAction(draft.messageId, draft.threadId)}
                        className="h-8 text-xs px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleConfirmAction(draft.messageId, draft.pendingAction, draft.threadId)}
                        className="h-8 text-xs px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-xs flex items-center gap-1.5"
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
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div>
                <h3 className="font-semibold text-base text-foreground">Recommended For You</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Proactive recommendations tailored to your workspace</p>
              </div>
              <Badge variant="secondary" className="text-xs font-medium">
                {forYouItems.length} Suggestions
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {forYouItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectForYou(item.prompt)}
                  className="group p-4 rounded-2xl border border-border/70 bg-card hover:bg-accent/40 hover:border-primary/40 transition-all cursor-pointer shadow-xs space-y-2.5 flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{item.icon}</span>
                        <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>
                      </div>
                      <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                      {item.desc}
                    </p>
                  </div>
                  <div className="flex items-center justify-end pt-2 border-t border-border/40">
                    <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Ask Assistant →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab: HISTORY ── */}
        {activeTab === "history" && (
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar max-w-3xl mx-auto w-full space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Previous Conversations ({threads.length})
              </span>
              <Button
                size="sm"
                onClick={createNewThread}
                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </Button>
            </div>

            {threads.length === 0 ? (
              <div className="text-center py-16 text-sm text-muted-foreground">
                No previous conversations found.
              </div>
            ) : (
              <div className="space-y-2">
                {threads.map((t) => {
                  const isActive = t.id === activeThread?.id
                  return (
                    <div
                      key={t.id}
                      onClick={() => handleSelectThread(t.id)}
                      className={cn(
                        "group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all text-xs font-medium",
                        isActive
                          ? "bg-primary/10 border-primary/30 text-foreground font-semibold shadow-xs"
                          : "bg-card/50 hover:bg-muted/80 border-border/60 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm leading-snug">{t.title || "New Conversation"}</p>
                          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                            {t.messages.length} {t.messages.length === 1 ? "message" : "messages"} • {formatTime(t.updatedAt || t.createdAt)}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-opacity"
                        onClick={(e) => deleteThread(t.id, e)}
                        title="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: CHAT ── */}
        {activeTab === "chat" && (
          <>
            {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {(!activeThread || activeThread.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-2xl mx-auto">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                  <Bot className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-xl font-bold tracking-tight mb-2">
                Hello! I&apos;m Aura, your 360° Life Assistant
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-md">
                I can help you monitor expenses, design workout routines, review self-care habits, summarize notes, and organize your day.
              </p>

              {/* Prompt Suggestions Grid */}
              <div className="w-full text-left">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
                  Suggested questions to get started
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SUGGESTED_PROMPTS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(item.prompt)}
                      className="text-left p-3 rounded-xl border bg-card/60 hover:bg-violet-500/5 hover:border-violet-500/30 transition-all group flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span>{item.icon}</span>
                        <span className="text-xs font-semibold text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {item.prompt}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto pb-6 px-1">
              {activeThread.messages.map((message) => {
                const isUser = message.role === "user"
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3 text-sm leading-relaxed transition-all",
                      isUser ? "justify-end" : "justify-start"
                    )}
                  >
                    {!isUser && (
                      <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "group relative rounded-2xl transition-all",
                        isUser ? "bg-primary text-primary-foreground rounded-tr-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-xs" : "bg-card border border-border rounded-tl-xs px-5 py-4 max-w-[94%] sm:max-w-[85%] shadow-xs"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-sm text-white font-normal">
                          {message.content}
                        </p>
                      ) : (
                        <div className="pr-0.5">
                          {message.activeTool && (
                            <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium text-foreground bg-secondary border border-border rounded-lg px-2.5 py-1">
                              {message.activeTool.status === "running" ? (
                                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                              ) : (
                                <Check className="h-3 w-3 text-emerald-500" />
                              )}
                              <span>{message.activeTool.label}</span>
                            </div>
                          )}

                          {message.content ? (
                            <FormattedMessage content={message.content} />
                          ) : message.isStreaming ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
                              <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                              <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                              <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                              <span className="ml-1.5 text-xs font-medium">Aura is thinking...</span>
                            </div>
                          ) : null}

                          {message.isStreaming && message.content && (
                            <span className="inline-block h-3.5 w-1 bg-primary animate-pulse ml-0.5 align-middle" />
                          )}

                          {/* Completed tool trace pills */}
                          {message.trace && message.trace.length > 0 && !message.isStreaming && (
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground/70 font-medium">Tools used:</span>
                              {message.trace.map((t, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 dark:bg-muted/40 rounded px-1.5 py-0.5 border border-border/50 font-mono"
                                >
                                  <Wrench className="h-2.5 w-2.5 text-primary" />
                                  {t.tool}
                                </span>
                              ))}
                            </div>
                          )}

                          {message.pendingAction && (
                            <div className="mt-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 space-y-2.5">
                              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>Action Confirmation Required</span>
                              </div>
                              <p className="text-xs text-foreground/90 font-medium">
                                {message.pendingAction.summary}
                              </p>
                              {message.actionStatus === "pending" || !message.actionStatus ? (
                                <div className="flex items-center gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    onClick={() => handleConfirmAction(message.id, message.pendingAction!)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3 text-xs gap-1.5 shadow-xs cursor-pointer"
                                    disabled={isLoading}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Confirm</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleCancelAction(message.id)}
                                    className="h-7 px-3 text-xs gap-1.5 border-border hover:bg-muted cursor-pointer"
                                    disabled={isLoading}
                                  >
                                    <X className="h-3.5 w-3.5" />
                                    <span>Cancel</span>
                                  </Button>
                                </div>
                              ) : message.actionStatus === "confirmed" ? (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Confirmed & Executed</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pt-0.5">
                                  <X className="h-3.5 w-3.5" />
                                  <span>Action Cancelled</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {(isUser || !message.isStreaming || Boolean(message.content)) && (
                        <div
                          className={cn(
                            "mt-3 pt-2.5 flex items-center text-[11px] border-t",
                          isUser
                            ? "text-violet-200/80 border-white/10 justify-end"
                            : "text-muted-foreground border-border/40 justify-between"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <span>{formatTime(message.createdAt)}</span>
                          {!isUser && (
                            <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">
                              • Aura 360 AI
                            </span>
                          )}
                        </div>

                        {!isUser && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(message.id, message.content)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground text-[11px] transition-colors"
                              title="Copy full message"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-500" />
                                  <span className="text-emerald-500 font-medium">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="h-8 w-8 rounded-xl bg-secondary border border-border flex items-center justify-center text-secondary-foreground shrink-0 mt-1 shadow-2xs">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isLoading && !activeThread.messages.some(m => m.isStreaming) && (
                <div className="flex gap-3 text-sm leading-relaxed justify-start">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-card border rounded-2xl rounded-bl-xs px-4 py-3 text-muted-foreground flex items-center gap-1.5 shadow-xs">
                    <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="text-xs ml-2 font-medium">Aura is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t bg-card/90 backdrop-blur-md">
          <div className="max-w-3xl mx-auto relative">
            {/* AI Command Palette */}
            <AiCommandPalette
              query={input}
              isOpen={showCommandPalette}
              onClose={() => setShowCommandPalette(false)}
              onSelectCommand={handleSelectCommand}
            />

            <div className="relative flex items-end gap-2 bg-muted/50 dark:bg-muted/30 border rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask Aura anything or type / for AI commands..."
                rows={1}
                className="flex-1 max-h-40 min-h-[40px] resize-none bg-transparent px-3 py-2 text-sm focus:outline-hidden placeholder:text-muted-foreground/60 leading-relaxed"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 shadow-xs transition-transform active:scale-95"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> to send</span>
                <span className="text-border">•</span>
                <button
                  onClick={() => {
                    setInput("/")
                    setShowCommandPalette(true)
                    textareaRef.current?.focus()
                  }}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md hover:bg-muted hover:text-foreground text-primary font-medium transition-colors cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>/ Commands</span>
                </button>
              </div>
              <span className="hidden sm:inline">Powered by Aura360</span>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  )
}
