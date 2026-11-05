/**
 * Aura's face: what each mood looks like. Pure data, no React.
 *
 * THIS FILE EXISTS TWICE: here (web) and in apps/mobile/src/features/ai/mascot/face.ts. The two apps are separate
 * packages, so keep both copies identical. The web draws it with SVG + CSS, the mobile app with react-native-svg
 * + Reanimated. Coordinates: the face lives in a 56 x 56 box, props in a 24 x 24 box.
 */

export type Mood =
  | "sleeping" // idle for a while: eyes shut, "z z z"
  | "waking" // first touch / first prompt: yawn, eyes pop open
  | "idle" // awake and waiting
  | "thinking" // prompt sent, nothing back yet
  | "searching" // reading the user's data (get_* tools)
  | "found" // a search just finished
  | "working" // writing data (create / log / add / save tools)
  | "talking" // the answer is streaming in
  | "asking" // an action is waiting for the user's OK
  | "happy" // finished without a problem
  | "oops" // something went wrong

export type EyeShape = "open" | "wide" | "narrow" | "closed" | "happy"
export type BrowShape = "focus" | "worried" | "raised" | "think"
export type MouthShape = "sleep" | "smile" | "flat" | "small-o" | "open-smile" | "wavy" | "big-smile" | "frown" | "yawn" | "talk"

export type FaceSpec = {
  eyes: EyeShape
  /** Where the eyes look, in face units (x right, y down). */
  look: readonly [number, number]
  mouth: MouthShape
  brow?: BrowShape
  /** The eyes sweep left and right (searching). */
  scan?: boolean
}

export const FACES: Record<Mood, FaceSpec> = {
  sleeping: { eyes: "closed", look: [0, 0], mouth: "sleep" },
  waking: { eyes: "wide", look: [0, 0], mouth: "yawn" },
  idle: { eyes: "open", look: [0, 0], mouth: "smile" },
  thinking: { eyes: "open", look: [3, -2.8], mouth: "flat", brow: "think" },
  searching: { eyes: "open", look: [0, 0], mouth: "small-o", scan: true },
  found: { eyes: "wide", look: [0, 0], mouth: "open-smile" },
  working: { eyes: "narrow", look: [0, 2.6], mouth: "flat", brow: "focus" },
  talking: { eyes: "open", look: [0, 0], mouth: "talk" },
  asking: { eyes: "wide", look: [0, 0.6], mouth: "wavy", brow: "raised" },
  happy: { eyes: "happy", look: [0, 0], mouth: "big-smile" },
  oops: { eyes: "open", look: [0, 1], mouth: "frown", brow: "worried" },
}

export const EYE_CENTERS = [20, 36] as const
export const EYE_Y = 25

/** Round eyes are ellipses; closed and happy eyes are curves (left, right). */
export const EYES: Record<EyeShape, { rx: number; ry: number } | { paths: readonly [string, string] }> = {
  open: { rx: 3.4, ry: 4.6 },
  wide: { rx: 3.9, ry: 5.9 },
  narrow: { rx: 3.7, ry: 2.4 },
  closed: { paths: ["M16.6 26 Q20 29.4 23.4 26", "M32.6 26 Q36 29.4 39.4 26"] },
  happy: { paths: ["M16.6 27.4 Q20 22.4 23.4 27.4", "M32.6 27.4 Q36 22.4 39.4 27.4"] },
}

export const BROWS: Record<BrowShape, readonly [string, string]> = {
  focus: ["M15.5 19 L23.5 21", "M40.5 19 L32.5 21"],
  worried: ["M15.5 21 L23.5 18.8", "M40.5 21 L32.5 18.8"],
  raised: ["M15.5 19 Q19.5 16 23.5 18", "M32.5 18 Q36.5 16 40.5 19"],
  think: ["M15.5 20 L23.5 20.5", "M32.5 18 Q36.5 15.5 40.5 18.5"],
}

/** Mouths are drawn with a stroke, or filled when `fill` is set. "talk" is animated and has no path. */
export const MOUTHS: Record<Exclude<MouthShape, "talk">, { d: string; fill?: boolean }> = {
  sleep: { d: "M25 37 Q28 38.6 31 37" },
  smile: { d: "M23 35.5 Q28 39.5 33 35.5" },
  flat: { d: "M25 37.5 L31 37.5" },
  "small-o": { d: "M26.2 37 a1.8 1.8 0 1 0 3.6 0 a1.8 1.8 0 1 0 -3.6 0" },
  "open-smile": { d: "M22.5 34.5 Q28 44 33.5 34.5 Z", fill: true },
  wavy: { d: "M23.5 37.5 Q25.75 35.5 28 37.5 T32.5 37.5" },
  "big-smile": { d: "M21.5 34 Q28 42.5 34.5 34" },
  frown: { d: "M23 38.5 Q28 34.5 33 38.5" },
  yawn: { d: "M25.2 37 a2.8 3.4 0 1 0 5.6 0 a2.8 3.4 0 1 0 -5.6 0", fill: true },
}

// ─── Props (the little icon above the head) ─────────────────────────────────────────────────────────────────

export type Glyph =
  | "magnifier"
  | "coin"
  | "dumbbell"
  | "fork"
  | "note"
  | "hanger"
  | "bag"
  | "link"
  | "drop"
  | "clock"
  | "bookmark"
  | "gear"
  | "question"
  | "zzz"
  | "dots"
  | "sparkle"
  | "sweat"

/** How a prop moves while it is shown. */
export type PropAnim = "swing" | "bob" | "spin" | "pulse" | "rise" | "hop"

/** Stroked outlines on a 24 grid. `filled` glyphs are solid shapes instead. */
export const GLYPHS: Record<Glyph, { paths: readonly string[]; filled?: boolean }> = {
  magnifier: { paths: ["M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13z", "M15.4 15.4L21 21"] },
  coin: { paths: ["M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z", "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 1 0 0-9z"] },
  dumbbell: { paths: ["M6.5 6.5v11", "M17.5 6.5v11", "M3.5 9v6", "M20.5 9v6", "M6.5 12h11"] },
  fork: { paths: ["M7 3v8", "M4.5 3v5a2.5 2.5 0 0 0 5 0V3", "M7 11v10", "M17 3c-2 1.5-3 4-3 7h3v11"] },
  note: { paths: ["M6 3h9l4 4v14H6z", "M15 3v4h4", "M9 12h7", "M9 16h7"] },
  hanger: { paths: ["M12 7a2 2 0 1 0-2-2", "M12 7v2", "M12 9L3.5 15.2a1.5 1.5 0 0 0 .9 2.7h15.2a1.5 1.5 0 0 0 .9-2.7L12 9"] },
  bag: { paths: ["M6 8h12l1 12H5z", "M9 8V6.5a3 3 0 0 1 6 0V8"] },
  link: {
    paths: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  },
  drop: { paths: ["M12 3C9 7.5 6 10.5 6 14a6 6 0 0 0 12 0c0-3.5-3-6.5-6-11z"] },
  clock: { paths: ["M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18z", "M12 7v5l3 2"] },
  bookmark: { paths: ["M6 3h12v18l-6-4-6 4z"] },
  gear: {
    paths: ["M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6z", "M12 2v3", "M12 19v3", "M2 12h3", "M19 12h3", "M4.9 4.9l2.1 2.1", "M17 17l2.1 2.1", "M4.9 19.1L7 17", "M17 7l2.1-2.1"],
  },
  question: { paths: ["M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3", "M12 17.2h.01"] },
  zzz: { paths: ["M4 4h5L4 10h5", "M12 12h4l-4 5h4", "M18 3h3l-3 3.5h3"] },
  dots: {
    filled: true,
    paths: ["M5 12m-1.9 0a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0", "M12 12m-1.9 0a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0", "M19 12m-1.9 0a1.9 1.9 0 1 0 3.8 0a1.9 1.9 0 1 0-3.8 0"],
  },
  sparkle: { filled: true, paths: ["M12 2.5l2 6.2 6.3 2-6.3 2-2 6.3-2-6.3-6.2-2 6.2-2z"] },
  sweat: { filled: true, paths: ["M12 3C9.5 7 7.5 9.5 7.5 13a4.5 4.5 0 0 0 9 0c0-3.5-2-6-4.5-10z"] },
}

export const GLYPH_ANIM: Record<Glyph, PropAnim> = {
  magnifier: "swing",
  coin: "pulse",
  dumbbell: "bob",
  fork: "swing",
  note: "bob",
  hanger: "swing",
  bag: "bob",
  link: "swing",
  drop: "bob",
  clock: "spin",
  bookmark: "bob",
  gear: "spin",
  question: "swing",
  zzz: "rise",
  dots: "hop",
  sparkle: "pulse",
  sweat: "bob",
}

/** Glyphs that float free (no round badge behind them). */
export const BARE_GLYPHS: ReadonlySet<Glyph> = new Set<Glyph>(["zzz", "dots", "sparkle", "sweat", "question"])

/** Small magnifier drawn over a module icon while searching ("looking through your transactions"). */
export const LENS = { circle: "M17 12.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 1 0 0-8.8z", handle: "M20.2 20.2L23 23" }
