"use client"

import { useState, useEffect, useRef, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useDebounce } from "@/hooks/use-debounce"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Search,
  Sparkles,
  Bot,
  StickyNote,
  DollarSign,
  Dumbbell,
  UtensilsCrossed,
  Shirt,
  Heart,
  Clock,
  Bookmark,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  X,
  PlusCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { PlatformSearchResult, SearchModule, UnifiedSearchResponse } from "@/lib/search/unified-search"

const MODULE_FILTERS: { id: SearchModule | "all"; label: string; icon: any; color: string }[] = [
  { id: "all", label: "All", icon: Sparkles, color: "text-primary" },
  { id: "finance", label: "Finance", icon: DollarSign, color: "text-emerald-500" },
  { id: "notes", label: "Notes", icon: StickyNote, color: "text-amber-500" },
  { id: "fitness", label: "Fitness", icon: Dumbbell, color: "text-purple-500" },
  { id: "food", label: "Food", icon: UtensilsCrossed, color: "text-orange-500" },
  { id: "fashion", label: "Fashion", icon: Shirt, color: "text-pink-500" },
  { id: "skincare", label: "Skincare", icon: Heart, color: "text-rose-500" },
  { id: "time", label: "Time", icon: Clock, color: "text-blue-500" },
  { id: "saved", label: "Saved", icon: Bookmark, color: "text-indigo-500" },
]

function getModuleIcon(module: SearchModule) {
  switch (module) {
    case "finance":
      return <DollarSign className="h-4 w-4 text-emerald-500" />
    case "notes":
      return <StickyNote className="h-4 w-4 text-amber-500" />
    case "fitness":
      return <Dumbbell className="h-4 w-4 text-purple-500" />
    case "food":
      return <UtensilsCrossed className="h-4 w-4 text-orange-500" />
    case "fashion":
      return <Shirt className="h-4 w-4 text-pink-500" />
    case "skincare":
      return <Heart className="h-4 w-4 text-rose-500" />
    case "time":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "saved":
      return <Bookmark className="h-4 w-4 text-indigo-500" />
    default:
      return <Search className="h-4 w-4 text-primary" />
  }
}

export function GlobalAiSearchDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<SearchModule | "all">("all")
  const [results, setResults] = useState<PlatformSearchResult[]>([])
  const [aiSummary, setAiSummary] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isPending, startTransition] = useTransition()

  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Listen for Cmd+K / Ctrl+K and custom trigger events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }

    const handleCustomOpen = () => setOpen(true)

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("open_aura360_search", handleCustomOpen)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("open_aura360_search", handleCustomOpen)
    }
  }, [])

  // 2. Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery("")
      setResults([])
      setAiSummary(undefined)
      setActiveFilter("all")
      setSelectedIndex(0)
    }
  }, [open])

  // 3. Search execution with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setAiSummary(undefined)
      setIsLoading(false)
      return
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch("/api/ai/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            module: activeFilter,
            includeAiSummary: true,
          }),
        })

        if (res.ok) {
          const data: UnifiedSearchResponse = await res.json()
          setResults(data.results || [])
          setAiSummary(data.aiSummary)
          setSelectedIndex(0)
        }
      } catch (err) {
        console.error("Search failed:", err)
      } finally {
        setIsLoading(false)
      }
    }, 280)

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [query, activeFilter])

  // 4. Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[selectedIndex]) {
        navigateItem(results[selectedIndex])
      }
    }
  }

  const navigateItem = (item: PlatformSearchResult) => {
    setOpen(false)
    startTransition(() => {
      router.push(item.href)
    })
  }

  const handleQuickAction = (href: string) => {
    setOpen(false)
    startTransition(() => {
      router.push(href)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[94vw] sm:max-w-2xl p-0 overflow-hidden border border-border/80 shadow-2xl bg-card/95 backdrop-blur-2xl rounded-2xl gap-0">
        <DialogHeader className="sr-only">
          <DialogTitle>AI Search Platform</DialogTitle>
        </DialogHeader>

        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/70 bg-card">
          <Search className="h-5 w-5 text-muted-foreground/70 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search transactions, notes, workouts, food, wardrobe, skincare, or ask AI..."
            className="flex-1 bg-transparent text-sm sm:text-base outline-none placeholder:text-muted-foreground/60 text-foreground font-medium"
          />
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted/50 px-1.5 font-mono text-[10px] text-muted-foreground font-semibold">
              ESC
            </kbd>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/40 bg-muted/20 overflow-x-auto no-scrollbar">
          {MODULE_FILTERS.map((f) => {
            const Icon = f.icon
            const isSelected = activeFilter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 border",
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground border-border/60"
                )}
              >
                <Icon className={cn("h-3 w-3", isSelected ? "text-primary-foreground" : f.color)} />
                <span>{f.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content Body */}
        <div className="max-h-[60vh] sm:max-h-[460px] overflow-y-auto p-3 space-y-2 no-scrollbar">
          {/* AI Instant Answer Banner */}
          {aiSummary && (
            <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 text-foreground space-y-1.5 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Aura Instant Insight</span>
              </div>
              <p className="text-xs sm:text-[13px] leading-relaxed text-foreground/90 font-medium">
                {aiSummary}
              </p>
            </div>
          )}

          {/* Search Results List */}
          {query.trim() && (
            <>
              {results.length === 0 && !isLoading ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground/80 mb-1">No items match "{query}"</p>
                  <p className="text-xs text-muted-foreground/70">
                    Try searching for keywords across notes, transactions, workouts, or select another module filter.
                  </p>
                </div>
              ) : (
                results.map((item, idx) => {
                  const isSelected = idx === selectedIndex
                  return (
                    <div
                      key={`${item.module}-${item.id}`}
                      onClick={() => navigateItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={cn(
                        "group flex items-start gap-3 p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all text-xs",
                        isSelected
                          ? "bg-primary/10 border-primary/30 shadow-xs"
                          : "bg-card/40 hover:bg-muted/60 border-border/50 text-muted-foreground"
                      )}
                    >
                      <div className="h-8 w-8 rounded-lg bg-background border border-border/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        {getModuleIcon(item.module)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className={cn("text-xs sm:text-sm font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                            {item.title}
                          </h4>
                          {item.badge && (
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {item.subtitle && (
                          <p className="text-[11px] font-medium text-foreground/80 mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                        )}

                        {item.snippet && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 leading-snug">
                            {item.snippet}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                        {item.date && (
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {item.date}
                          </span>
                        )}
                        <ArrowRight className={cn("h-3.5 w-3.5 transition-transform", isSelected ? "text-primary translate-x-0.5" : "text-muted-foreground/40")} />
                      </div>
                    </div>
                  )
                })
              )}
            </>
          )}

          {/* Default Quick Actions (When query is empty) */}
          {!query.trim() && (
            <div className="space-y-3 py-1">
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Quick Actions
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <button
                    onClick={() => handleQuickAction("/dashboard/chat")}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-left transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        Ask Aura Assistant
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Open conversational AI workspace
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("/dashboard/notes")}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-left transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                      <StickyNote className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-amber-500 transition-colors truncate">
                        Write Note
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Capture thoughts, ideas, tasks
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("/dashboard/finance")}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-left transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-emerald-500 transition-colors truncate">
                        Record Transaction
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Log expense, income or transfer
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("/dashboard/fitness")}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/60 bg-card/60 hover:bg-muted text-left transition-colors group"
                  >
                    <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center shrink-0">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground group-hover:text-purple-500 transition-colors truncate">
                        Log Workout
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Track exercise and training
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
                  Popular Queries
                </span>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "Grocery transactions",
                    "Leg day workout",
                    "Weekly meal routine",
                    "Skincare routine",
                    "Deep work session",
                    "Oldest wishlist item",
                  ].map((tip) => (
                    <button
                      key={tip}
                      onClick={() => setQuery(tip)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-border/50 bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-background border text-[10px]">↑</kbd>
              <kbd className="px-1 rounded bg-background border text-[10px]">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 rounded bg-background border text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span className="text-primary font-sans font-medium flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Aura360 Platform AI
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
