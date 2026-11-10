/**
 * Aura's face: the moods an expression can be in. Pure data, no React.
 *
 * THIS FILE EXISTS TWICE: in apps/web/lib/ai/mascot/face.ts and apps/mobile/src/features/ai/mascot/face.ts. The
 * two apps are separate packages, so keep both copies byte-identical. See characters.ts for which mascot draws
 * which mood.
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

export const MOODS: readonly Mood[] = [
  "sleeping",
  "waking",
  "idle",
  "thinking",
  "searching",
  "found",
  "working",
  "talking",
  "asking",
  "happy",
  "oops",
]
