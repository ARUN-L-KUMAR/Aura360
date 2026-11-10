/**
 * The mascot characters a user can pick for Aura. Pure data, no React, no RN-specific `require`.
 *
 * THIS FILE EXISTS TWICE: here (mobile) and in apps/web/lib/ai/mascot/characters.ts. The two apps are separate
 * packages, so keep both copies identical (ids, names and order). The actual image assets are resolved with
 * static `require(...)` calls in components/ai/aura-face.tsx, since Metro needs a literal require per image and
 * this file has to stay loadable outside of Metro (tests, web).
 */

export type MascotId = "Robot" | "Luffy" | "Zoro" | "Sanji" | "Chopper"

export type MascotOption = { id: MascotId; name: string }

/** Order shown in the picker. "Robot" has its own art; the rest currently reuse it as a placeholder. */
export const MASCOTS: readonly MascotOption[] = [
  { id: "Robot", name: "Robot" },
  { id: "Luffy", name: "Luffy" },
  { id: "Zoro", name: "Zoro" },
  { id: "Sanji", name: "Sanji" },
  { id: "Chopper", name: "Chopper" },
]

export const DEFAULT_MASCOT: MascotId = "Robot"

export function isMascotId(value: string | null | undefined): value is MascotId {
  return !!value && MASCOTS.some((m) => m.id === value)
}
