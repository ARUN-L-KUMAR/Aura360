"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ComboInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  /** Suggestions shown in the dropdown. The user can still type anything else. */
  options: string[]
  placeholder?: string
  required?: boolean
  /** Show option text capitalised (values stay as written) */
  capitalize?: boolean
  /** Small heading above the list, e.g. "Sizes on this product" */
  emptyHint?: string
  /** Options to list first and tag (e.g. the user's saved size). Only ones also present in `options` are used. */
  pinned?: string[]
  pinnedLabel?: string
}

/** Text input with a suggestion dropdown: pick from the list or type your own value. */
export function ComboInput({ id, value, onChange, options, placeholder, required, capitalize = false, emptyHint, pinned = [], pinnedLabel = "Yours" }: ComboInputProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const anchorRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const typed = value.trim().toLowerCase()
  const exact = options.some((o) => o.toLowerCase() === typed)

  // Pinned options (that exist in the list) go first
  const pinnedKey = pinned.join("|")
  const pinnedSet = useMemo(() => {
    const wanted = new Set(pinned.map((p) => p.toLowerCase()))
    return new Set(options.filter((o) => wanted.has(o.toLowerCase())))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, pinnedKey])
  const ordered = useMemo(
    () => (pinnedSet.size ? [...options.filter((o) => pinnedSet.has(o)), ...options.filter((o) => !pinnedSet.has(o))] : options),
    [options, pinnedSet]
  )

  // Filter while typing; once the value is a complete option (or empty) show the whole list so it can be changed
  const visible = useMemo(
    () => (typed && !exact ? ordered.filter((o) => o.toLowerCase().includes(typed)) : ordered),
    [ordered, typed, exact]
  )

  useEffect(() => {
    setActive(-1)
  }, [value, open])

  useEffect(() => {
    if (active < 0) return
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" })
  }, [active])

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!open) setOpen(true)
      else setActive((i) => Math.min(i + 1, visible.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && open && active >= 0 && visible[active]) {
      e.preventDefault() // pick the highlighted option instead of submitting the form
      choose(visible[active])
    } else if (e.key === "Escape" && open) {
      e.stopPropagation()
      setOpen(false)
    }
  }

  return (
    <Popover open={open && (visible.length > 0 || Boolean(emptyHint))} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative">
          <Input
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-autocomplete="list"
            autoComplete="off"
            placeholder={placeholder}
            required={required}
            value={value}
            className="pr-9"
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            tabIndex={-1}
            aria-label="Show suggestions"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOpen((o) => !o)}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-1"
        // keep focus in the input so typing continues while the list is open
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (anchorRef.current?.contains(e.target as Node)) e.preventDefault()
        }}
        // the dialog blocks wheel scrolling outside itself; let this list scroll
        onWheel={(e) => e.stopPropagation()}
      >
        <div ref={listRef} role="listbox" className="max-h-56 overflow-y-auto">
          {visible.length === 0 && emptyHint && <p className="px-2 py-2 text-xs text-muted-foreground">{emptyHint}</p>}
          {visible.map((option, i) => {
            const selected = option.toLowerCase() === typed
            return (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected}
                data-index={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(option)}
                onMouseEnter={() => setActive(i)}
                className={cn(
                  "flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  capitalize && "capitalize"
                )}
              >
                <span className="flex items-center gap-2">
                  {option}
                  {pinnedSet.has(option) && (
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                      {pinnedLabel}
                    </span>
                  )}
                </span>
                {selected && <Check className="h-3.5 w-3.5" />}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
