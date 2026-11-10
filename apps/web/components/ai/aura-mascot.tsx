"use client"

import { cn } from "@/lib/utils"
import { moodImage } from "@/lib/ai/mascot/characters"
import type { Mood } from "@/lib/ai/mascot/face"
import { useMascot } from "@/lib/ai/mascot/selection"
import type { ToolActivity } from "@/lib/ai/mascot/mood"

type AuraMascotProps = {
  mood: Mood
  /** Kept for API compatibility with callers; the artwork already shows the activity. */
  activity?: ToolActivity | null
  /** Width and height of the face in px. */
  size?: number
  /** Kept for API compatibility; each mood's artwork already includes its own icon/accent. */
  showProp?: boolean
  className?: string
}

/** Which little animated cue plays near the mascot's head for a mood, or none. Purely decorative. */
const MOOD_FX: Partial<Record<Mood, "zzz" | "dots" | "sparkle" | "alert">> = {
  sleeping: "zzz",
  thinking: "dots",
  searching: "dots",
  found: "sparkle",
  happy: "sparkle",
  oops: "alert",
}

/**
 * Aura's face: a small illustrated mascot, one image per mood (sliced from a sticker sheet), picked by the
 * user in Settings. Swapping moods or mascots just swaps the image — see lib/ai/mascot/characters.ts. A small
 * CSS-animated cue (zzz, thinking dots, sparkle, alert) plays near the head for moods that call for one —
 * skipped below a minimum size, where it would just be noise.
 */
export function AuraMascot({ mood, size = 32, className }: AuraMascotProps) {
  const [mascot] = useMascot()
  const fx = size >= 40 ? MOOD_FX[mood] : undefined
  return (
    <span className={cn("aura inline-flex", className)} data-mood={mood} style={{ width: size, height: size }}>
      <img
        src={moodImage(mascot, mood)}
        alt=""
        width={size}
        height={size}
        className="aura-body h-full w-full object-contain"
        draggable={false}
      />
      {fx === "zzz" && (
        <span className="aura-fx aura-fx-zzz" aria-hidden="true">
          <span>z</span>
          <span>z</span>
          <span>z</span>
        </span>
      )}
      {fx === "dots" && (
        <span className="aura-fx aura-fx-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      )}
      {fx === "sparkle" && (
        <span className="aura-fx aura-fx-sparkle" aria-hidden="true">
          <span>✦</span>
          <span>✦</span>
        </span>
      )}
      {fx === "alert" && (
        <span className="aura-fx aura-fx-alert" aria-hidden="true">
          <span>!</span>
        </span>
      )}
    </span>
  )
}
