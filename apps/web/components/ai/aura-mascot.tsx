"use client"

import type { CSSProperties } from "react"

import { cn } from "@/lib/utils"
import { BARE_GLYPHS, BROWS, EYE_CENTERS, EYE_Y, EYES, FACES, GLYPHS, GLYPH_ANIM, LENS, MOUTHS, type Mood } from "@/lib/ai/mascot/face"
import { propFor, type ToolActivity } from "@/lib/ai/mascot/mood"

type AuraMascotProps = {
  mood: Mood
  /** The tool being used (for the little icon above the head while searching or working). */
  activity?: ToolActivity | null
  /** Width and height of the face in px. */
  size?: number
  /** Show the little icon above the head. */
  showProp?: boolean
  className?: string
}

/**
 * Aura's animated face. It draws only the features (eyes, brows, mouth) in `currentColor`, so the parent decides
 * the background: white on the launcher button, the accent colour in the panel header. All motion is CSS in
 * globals.css (`.aura-*`) and switches off under prefers-reduced-motion, leaving the expression itself.
 */
export function AuraMascot({ mood, activity = null, size = 32, showProp = true, className }: AuraMascotProps) {
  const face = FACES[mood]
  const eyes = EYES[face.eyes]
  const brow = face.brow ? BROWS[face.brow] : null
  const prop = showProp ? propFor(mood, activity) : null
  const roundEyes = "rx" in eyes
  const bare = prop ? BARE_GLYPHS.has(prop.glyph) : false
  const glyph = prop ? GLYPHS[prop.glyph] : null

  return (
    <span
      className={cn("aura", className)}
      data-mood={mood}
      data-scan={face.scan ? "true" : undefined}
      data-blink={roundEyes && mood !== "working" ? "true" : undefined}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 56 56" className="aura-body" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <g className="aura-eyes" style={{ "--lx": `${face.look[0]}px`, "--ly": `${face.look[1]}px` } as CSSProperties}>
          {roundEyes
            ? EYE_CENTERS.map((cx) => <ellipse key={cx} className="aura-eye" cx={cx} cy={EYE_Y} rx={eyes.rx} ry={eyes.ry} fill="currentColor" stroke="none" />)
            : eyes.paths.map((d) => <path key={d} d={d} strokeWidth={2.4} />)}
        </g>

        {brow ? brow.map((d) => <path key={d} d={d} strokeWidth={2} />) : null}

        {face.mouth === "talk" ? (
          <ellipse className="aura-mouth-talk" cx={28} cy={37} rx={3.2} ry={3} fill="currentColor" stroke="none" />
        ) : (
          <path
            d={MOUTHS[face.mouth].d}
            strokeWidth={2.2}
            fill={MOUTHS[face.mouth].fill ? "currentColor" : "none"}
            stroke={MOUTHS[face.mouth].fill ? "none" : "currentColor"}
          />
        )}
      </svg>

      {prop && glyph ? (
        // `key` restarts the pop-in whenever the icon changes.
        <span key={`${mood}-${prop.glyph}`} className={cn("aura-prop", bare && "aura-prop--bare")}>
          <span className="aura-prop-in">
            <svg
              viewBox="0 0 24 24"
              className="aura-glyph"
              data-anim={GLYPH_ANIM[prop.glyph]}
              fill={glyph.filled ? "currentColor" : "none"}
              stroke={glyph.filled ? "none" : "currentColor"}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {glyph.paths.map((d) => (
                <path key={d} d={d} />
              ))}
              {prop.lens ? (
                <>
                  <path d={LENS.circle} fill="var(--card, #fff)" />
                  <path d={LENS.handle} />
                </>
              ) : null}
            </svg>
          </span>
        </span>
      ) : null}
    </span>
  )
}
