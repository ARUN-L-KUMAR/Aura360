"use client"

import { useState, useEffect, useRef } from "react"
import {
  DollarSign,
  Dumbbell,
  UtensilsCrossed,
  StickyNote,
  Clock,
  Sparkles,
  Search,
  Heart,
  Plus,
  Compass,
  ArrowRight,
  TrendingDown,
  Calendar,
  Flame,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface AICommand {
  id: string
  command: string
  label: string
  description: string
  category: "Finance" | "Fitness & Health" | "Productivity" | "Self Care" | "System"
  icon: any
  color: string
  promptTemplate: string
  requiresArgs?: boolean
  argsPlaceholder?: string
}

export const AI_COMMANDS: AICommand[] = [
  // ─── Finance ───
  {
    id: "balance",
    command: "/balance",
    label: "Check Balances",
    description: "View current account balances and total net worth",
    category: "Finance",
    icon: DollarSign,
    color: "text-emerald-500 bg-emerald-500/10",
    promptTemplate: "Check my current account balances and overall net worth.",
  },
  {
    id: "transactions",
    command: "/transactions",
    label: "Recent Transactions",
    description: "Analyze latest transactions, income, and spending breakdown",
    category: "Finance",
    icon: TrendingDown,
    color: "text-emerald-500 bg-emerald-500/10",
    promptTemplate: "Review my recent transactions and show me where I spent most.",
  },
  {
    id: "expense",
    command: "/expense",
    label: "Log Expense",
    description: "Record a new expense (e.g. /expense 250 lunch)",
    category: "Finance",
    icon: DollarSign,
    color: "text-emerald-500 bg-emerald-500/10",
    promptTemplate: "Log an expense of ₹",
    requiresArgs: true,
    argsPlaceholder: "amount and category (e.g. ₹350 for groceries)",
  },
  {
    id: "budget",
    command: "/budget",
    label: "Budget Status",
    description: "Check monthly budgets vs actual spending progress",
    category: "Finance",
    icon: DollarSign,
    color: "text-emerald-500 bg-emerald-500/10",
    promptTemplate: "How am I pacing against my monthly budgets?",
  },

  // ─── Fitness & Nutrition ───
  {
    id: "workout",
    command: "/workout",
    label: "Log Workout",
    description: "Record an exercise or training session",
    category: "Fitness & Health",
    icon: Dumbbell,
    color: "text-purple-500 bg-purple-500/10",
    promptTemplate: "Log a workout: ",
    requiresArgs: true,
    argsPlaceholder: "workout type and duration (e.g. 45m leg day)",
  },
  {
    id: "fitness-summary",
    command: "/fitness-summary",
    label: "Fitness Summary",
    description: "Summarize workout frequency, sets, and training streaks",
    category: "Fitness & Health",
    icon: Flame,
    color: "text-purple-500 bg-purple-500/10",
    promptTemplate: "Summarize my workout logs and training volume for this week.",
  },
  {
    id: "meal",
    command: "/meal",
    label: "Log Meal",
    description: "Record breakfast, lunch, dinner or snack with calories",
    category: "Fitness & Health",
    icon: UtensilsCrossed,
    color: "text-orange-500 bg-orange-500/10",
    promptTemplate: "Log a meal: ",
    requiresArgs: true,
    argsPlaceholder: "meal name and type (e.g. grilled chicken salad for lunch)",
  },

  // ─── Productivity ───
  {
    id: "plan",
    command: "/plan",
    label: "Plan My Day",
    description: "Organize tasks, routine, and priority focus for today",
    category: "Productivity",
    icon: Calendar,
    color: "text-blue-500 bg-blue-500/10",
    promptTemplate: "Help me organize and plan my day productively based on my routine.",
  },
  {
    id: "note",
    command: "/note",
    label: "Create Note",
    description: "Capture an idea, meeting notes, or quick thought",
    category: "Productivity",
    icon: StickyNote,
    color: "text-amber-500 bg-amber-500/10",
    promptTemplate: "Create a note: ",
    requiresArgs: true,
    argsPlaceholder: "note title and content",
  },
  {
    id: "time",
    command: "/time",
    label: "Log Time Entry",
    description: "Track deep work session or project duration",
    category: "Productivity",
    icon: Clock,
    color: "text-blue-500 bg-blue-500/10",
    promptTemplate: "Log a time entry: ",
    requiresArgs: true,
    argsPlaceholder: "activity name and duration (e.g. 60m coding)",
  },

  // ─── Self Care ───
  {
    id: "skincare",
    command: "/skincare",
    label: "Skincare Routine",
    description: "Review morning or evening skincare sequence and products",
    category: "Self Care",
    icon: Heart,
    color: "text-rose-500 bg-rose-500/10",
    promptTemplate: "Review my skincare routine products and give me best practice tips.",
  },

  // ─── Search & Workspace ───
  {
    id: "search",
    command: "/search",
    label: "Search Workspace",
    description: "Find items across notes, transactions, and logs",
    category: "System",
    icon: Search,
    color: "text-indigo-500 bg-indigo-500/10",
    promptTemplate: "Search my workspace for ",
    requiresArgs: true,
    argsPlaceholder: "search keyword (e.g. groceries or project roadmap)",
  },
  {
    id: "clear",
    command: "/clear",
    label: "New Chat",
    description: "Reset conversation and start fresh",
    category: "System",
    icon: Plus,
    color: "text-slate-500 bg-slate-500/10",
    promptTemplate: "__NEW_CHAT__",
  },
]

interface AiCommandPaletteProps {
  query: string
  isOpen: boolean
  onClose: () => void
  onSelectCommand: (command: AICommand) => void
  className?: string
}

export function AiCommandPalette({
  query,
  isOpen,
  onClose,
  onSelectCommand,
  className,
}: AiCommandPaletteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // Filter commands by query string (ignoring leading slash)
  const cleanQuery = query.startsWith("/") ? query.slice(1).toLowerCase().trim() : query.toLowerCase().trim()

  const filteredCommands = cleanQuery
    ? AI_COMMANDS.filter((cmd) => {
        const cmdName = cmd.command.slice(1).toLowerCase()
        const label = cmd.label.toLowerCase()
        const desc = cmd.description.toLowerCase()
        return cmdName.includes(cleanQuery) || label.includes(cleanQuery) || desc.includes(cleanQuery)
      })
    : AI_COMMANDS

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Handle keyboard events (up, down, enter, esc)
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "Enter" && !e.shiftKey) {
        if (filteredCommands[selectedIndex]) {
          e.preventDefault()
          onSelectCommand(filteredCommands[selectedIndex])
        }
      } else if (e.key === "Escape") {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, selectedIndex, filteredCommands, onSelectCommand, onClose])

  // Auto-scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        "absolute z-50 bottom-full mb-2 left-0 right-0 max-h-72 sm:max-h-80 overflow-y-auto bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-2 no-scrollbar animate-in fade-in slide-in-from-bottom-2 duration-150",
        className
      )}
    >
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/50 mb-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-primary" />
          <span>AI Commands</span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground/70 lowercase">
          Type command or select with ↵
        </span>
      </div>

      {filteredCommands.length === 0 ? (
        <div className="p-4 text-center text-xs text-muted-foreground">
          No command matching "{query}". Type to ask Aura directly.
        </div>
      ) : (
        <div ref={listRef} className="space-y-1">
          {filteredCommands.map((cmd, idx) => {
            const isSelected = idx === selectedIndex
            const Icon = cmd.icon
            return (
              <div
                key={cmd.id}
                onClick={() => onSelectCommand(cmd)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "group flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all text-xs",
                  isSelected
                    ? "bg-primary/10 border border-primary/25 shadow-2xs"
                    : "hover:bg-muted/60 border border-transparent text-muted-foreground"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center shrink-0 border border-border/40", cmd.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("font-semibold font-mono text-xs", isSelected ? "text-primary" : "text-foreground")}>
                        {cmd.command}
                      </span>
                      <span className="text-[11px] font-medium text-foreground/80 truncate">
                        {cmd.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 leading-snug">
                      {cmd.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary/80 font-mono text-muted-foreground/70 hidden sm:inline">
                    {cmd.category}
                  </span>
                  <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/30")} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
