"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"
import { MASCOTS, moodImage } from "@/lib/ai/mascot/characters"
import { useMascot } from "@/lib/ai/mascot/selection"

/** Settings > Aura Assistant: pick which mascot shows in the launcher button and chat panel. */
export function MascotPicker() {
  const [selected, setMascot] = useMascot()

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
      {MASCOTS.map((m) => {
        const active = m.id === selected
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => setMascot(m.id)}
            aria-pressed={active}
            className={cn(
              "group flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
              active ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-card/60 hover:border-primary/40 hover:bg-accent/40"
            )}
          >
            <span className="relative h-14 w-14 overflow-hidden rounded-full border border-border/60 bg-muted/40">
              <img src={moodImage(m.id, "idle")} alt="" className="h-full w-full object-cover" draggable={false} />
              {active && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </span>
            <span className={cn("text-xs font-semibold", active ? "text-primary" : "text-foreground")}>{m.name}</span>
          </button>
        )
      })}
    </div>
  )
}
