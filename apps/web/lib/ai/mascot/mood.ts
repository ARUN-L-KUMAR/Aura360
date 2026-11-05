/**
 * Aura's mood: turns what the assistant is doing into an expression.
 *
 * THIS FILE EXISTS TWICE: here (web) and in apps/mobile/src/features/ai/mascot/mood.ts. The two apps are separate
 * packages, so keep both copies identical (see face.ts for the drawing data).
 *
 *   asleep ──touch / prompt──> waking ──> idle ──(20 s quiet)──> asleep
 *   prompt sent ─> thinking ─> searching (read tool) ─> found ─> talking ─> happy
 *                           └> working   (write tool) ───────────┘        └> oops on an error
 *   an action waits for the user's OK ─> asking
 */

import { useCallback, useEffect, useRef, useState } from "react"

import type { Glyph, Mood } from "./face"

export type { Mood } from "./face"

/** Quiet time (no prompt, nothing waiting, panel closed) before Aura falls asleep. */
export const SLEEP_AFTER_MS = 20_000
const WAKE_MS = 800
const FOUND_MS = 1000
const DONE_MS = 2200

// ─── What kind of work a tool is ────────────────────────────────────────────────────────────────────────────

export type ToolActivity = {
  /** "search" reads the user's data, "work" writes it. */
  kind: "search" | "work"
  /** The icon of the module being worked on. */
  glyph: Glyph
}

const MODULE_GLYPHS: [RegExp, Glyph][] = [
  [/transaction|budget|balance|goal/, "coin"],
  [/fitness|workout/, "dumbbell"],
  [/food|meal/, "fork"],
  [/note/, "note"],
  [/wardrobe|wishlist|fashion/, "hanger"],
  [/skincare/, "drop"],
  [/time/, "clock"],
  [/saved|save_item/, "bookmark"],
]

/** Which kind of work a tool does and which module it touches. Unknown tools still get a sensible face. */
export function activityForTool(tool: string): ToolActivity {
  const kind: ToolActivity["kind"] = tool.startsWith("get_") ? "search" : "work"
  if (tool === "get_product_from_link") return { kind, glyph: "link" }
  if (tool === "add_product_from_link") return { kind, glyph: "bag" }
  const found = MODULE_GLYPHS.find(([pattern]) => pattern.test(tool))
  return { kind, glyph: found ? found[1] : kind === "search" ? "magnifier" : "gear" }
}

export type MoodProp = { glyph: Glyph; /** Draw a small magnifier over the icon. */ lens: boolean }

/** The little icon shown above the head for a mood, or null for none. */
export function propFor(mood: Mood, activity: ToolActivity | null): MoodProp | null {
  switch (mood) {
    case "sleeping":
      return { glyph: "zzz", lens: false }
    case "thinking":
      return { glyph: "dots", lens: false }
    case "searching":
      return { glyph: activity?.glyph ?? "magnifier", lens: !!activity && activity.glyph !== "magnifier" }
    case "working":
      return { glyph: activity?.glyph ?? "gear", lens: false }
    case "found":
    case "happy":
      return { glyph: "sparkle", lens: false }
    case "asking":
      return { glyph: "question", lens: false }
    case "oops":
      return { glyph: "sweat", lens: false }
    default:
      return null
  }
}

// ─── The state machine ──────────────────────────────────────────────────────────────────────────────────────

export type AuraSignals = {
  /** A reply is being produced (request sent, not finished). */
  busy: boolean
  /** The tool the assistant is using right now, or the last one it finished during this reply. */
  tool: { name: string; running: boolean } | null
  /** Text of the reply has started arriving. */
  streaming: boolean
  /** An action is waiting for the user to confirm it. */
  waitingForYou: boolean
  /** Number of failed replies so far. A rise while busy means this reply failed. */
  errors: number
  /** The chat panel is open: the user is right here, so do not fall asleep. */
  attended: boolean
}

function liveMood(s: AuraSignals): Mood {
  if (s.busy) {
    if (s.tool?.running) return activityForTool(s.tool.name).kind === "search" ? "searching" : "working"
    return s.streaming ? "talking" : "thinking"
  }
  return s.waitingForYou ? "asking" : "idle"
}

export type AuraMood = {
  mood: Mood
  activity: ToolActivity | null
  /** Call on touch / hover / focus: wakes Aura up and keeps it awake a while longer. */
  wake: () => void
}

export function useAuraMood(s: AuraSignals): AuraMood {
  const [asleep, setAsleep] = useState(true)
  const [shot, setShot] = useState<Mood | null>(null)
  const [wakeTick, setWakeTick] = useState(0)
  const asleepRef = useRef(true)
  const shotTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sleepTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const previous = useRef({ busy: false, toolRunning: false })
  const errorsAtStart = useRef(s.errors)

  const setSleeping = useCallback((value: boolean) => {
    asleepRef.current = value
    setAsleep(value)
  }, [])

  /** A short expression that plays once, then hands back to the live mood. */
  const play = useCallback((mood: Mood, ms: number) => {
    if (shotTimer.current) clearTimeout(shotTimer.current)
    setShot(mood)
    shotTimer.current = setTimeout(() => setShot(null), ms)
  }, [])

  const wake = useCallback(() => {
    if (asleepRef.current) {
      setSleeping(false)
      play("waking", WAKE_MS)
    }
    setWakeTick((tick) => tick + 1)
  }, [play, setSleeping])

  // Reacts to changes of what the assistant is doing.
  useEffect(() => {
    const before = previous.current
    const toolRunning = !!s.tool?.running

    if (s.busy && !before.busy) {
      errorsAtStart.current = s.errors
      if (asleepRef.current) {
        setSleeping(false)
        play("waking", WAKE_MS)
      }
    }
    if (!s.busy && before.busy && !s.waitingForYou) {
      play(s.errors > errorsAtStart.current ? "oops" : "happy", DONE_MS)
    }
    if (before.toolRunning && !toolRunning && s.busy && s.tool && activityForTool(s.tool.name).kind === "search") {
      play("found", FOUND_MS)
    }
    if (s.waitingForYou && asleepRef.current) setSleeping(false)

    previous.current = { busy: s.busy, toolRunning }
  }, [s.busy, s.tool, s.errors, s.waitingForYou, play, setSleeping])

  // Falls asleep after a quiet spell.
  const active = s.busy || s.waitingForYou || s.attended || shot !== null
  useEffect(() => {
    if (sleepTimer.current) clearTimeout(sleepTimer.current)
    if (active || asleep) return
    sleepTimer.current = setTimeout(() => setSleeping(true), SLEEP_AFTER_MS)
    return () => {
      if (sleepTimer.current) clearTimeout(sleepTimer.current)
    }
  }, [active, asleep, wakeTick, setSleeping])

  useEffect(
    () => () => {
      if (shotTimer.current) clearTimeout(shotTimer.current)
      if (sleepTimer.current) clearTimeout(sleepTimer.current)
    },
    [],
  )

  const live = liveMood(s)
  const mood: Mood = shot ?? (live === "idle" && asleep ? "sleeping" : live)
  const activity = s.tool && (mood === "searching" || mood === "working") ? activityForTool(s.tool.name) : null
  return { mood, activity, wake }
}

/** A short line for the launcher's label / screen readers. Search and work lines are better given by the tool itself. */
export const MOOD_TEXT: Record<Mood, string> = {
  sleeping: "Ask Aura",
  waking: "Hi!",
  idle: "Ask Aura",
  thinking: "Thinking…",
  searching: "Looking it up…",
  found: "Found it!",
  working: "Working on it…",
  talking: "Answering…",
  asking: "Needs your OK",
  happy: "Done!",
  oops: "Something went wrong",
}
