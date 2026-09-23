"use client"

import { useState, useEffect, useRef } from "react"
import { 
  Sparkles, 
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
  ArrowDown
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
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Message {
  id: string
  role: "user" | "model"
  content: string
  createdAt: string
  source?: "ai" | "fallback"
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

export function ChatPageClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [input, setInput] = useState("")
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
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || "Unable to get response from Aura")
      }

      const data = await response.json()
      const aiReply: Message = {
        id: `msg_ai_${Date.now()}`,
        role: "model",
        content: data.reply || "I'm sorry, I couldn't generate a reply.",
        createdAt: new Date().toISOString(),
        source: data.source,
      }

      const finalMessages = [...updatedMessages, aiReply]
      const finalThread: Thread = {
        ...updatedThread,
        messages: finalMessages,
        updatedAt: new Date().toISOString(),
      }

      const finalizedThreads = threads.map(t => t.id === activeThread.id ? finalThread : t)
      saveThreads(finalizedThreads, activeThread.id)
    } catch (err: any) {
      console.error("AI Chat Error:", err)
      toast.error(err.message || "Failed to reach Aura AI")
      
      const errorReply: Message = {
        id: `msg_err_${Date.now()}`,
        role: "model",
        content: `⚠️ ${err.message || "Something went wrong while connecting to the AI assistant. Please check your connection or Gemini API key."}`,
        createdAt: new Date().toISOString(),
        source: "fallback",
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20">
              <Sparkles className="h-4 w-4 animate-pulse" />
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
            className="w-full justify-start gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm"
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
                  isActive
                    ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 shadow-xs"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 mr-2">
                  <MessageSquare className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-violet-500" : "text-muted-foreground/60")} />
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
                <Database className="h-3.5 w-3.5 text-indigo-500" />
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
              <div className="h-7 w-7 rounded-lg bg-violet-600/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold shrink-0">
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
              <SelectContent align="end" className="w-[310px]">
                <SelectGroup>
                  <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Select Gemini Model
                  </div>
                  {CHAT_MODELS.map((model) => (
                    <SelectItem key={model.id} value={model.id} className="text-xs py-2 cursor-pointer">
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{model.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono text-muted-foreground">
                            {model.latency}
                          </span>
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
              <Badge variant="secondary" className="hidden md:inline-flex text-[11px] font-normal gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
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

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
          {(!activeThread || activeThread.messages.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-2xl mx-auto">
              <div className="relative mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-violet-500/20">
                  <Sparkles className="h-8 w-8 animate-bounce" />
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
                      <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shrink-0 mt-1 shadow-md shadow-violet-500/10">
                        <Sparkles className="h-4 w-4" />
                      </div>
                    )}

                    <div
                      className={cn(
                        "group relative rounded-2xl transition-all",
                        isUser
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-tr-xs px-4 py-3 max-w-[85%] sm:max-w-[75%] shadow-md shadow-violet-500/15"
                          : "bg-card/95 dark:bg-card/80 border border-border/80 rounded-tl-xs px-5 py-4 max-w-[94%] sm:max-w-[85%] shadow-xs backdrop-blur-sm"
                      )}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words leading-relaxed text-sm text-white font-normal">
                          {message.content}
                        </p>
                      ) : (
                        <div className="pr-0.5">
                          <FormattedMessage content={message.content} />
                        </div>
                      )}

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
                    </div>

                    {isUser && (
                      <div className="h-8 w-8 rounded-xl bg-violet-100 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-800 flex items-center justify-center text-violet-700 dark:text-violet-300 shrink-0 mt-1 shadow-2xs">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 text-sm leading-relaxed justify-start">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-white shrink-0 mt-0.5 animate-pulse">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="bg-muted/60 border rounded-2xl rounded-bl-xs px-4 py-3 text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-cyan-500 animate-bounce" style={{ animationDelay: "300ms" }} />
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
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-muted/50 dark:bg-muted/30 border rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500/50 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                  e.target.style.height = "auto"
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask Aura anything about your finances, fitness, meals, notes, or routine..."
                rows={1}
                className="flex-1 max-h-40 min-h-[40px] resize-none bg-transparent px-3 py-2 text-sm focus:outline-hidden placeholder:text-muted-foreground/60 leading-relaxed"
                disabled={isLoading}
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-9 w-9 rounded-xl bg-violet-600 hover:bg-violet-700 text-white shrink-0 shadow-sm transition-transform active:scale-95"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-muted-foreground">
              <span>Press <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Shift+Enter</kbd> for new line</span>
              <span className="hidden sm:inline">Powered by Gemini AI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
