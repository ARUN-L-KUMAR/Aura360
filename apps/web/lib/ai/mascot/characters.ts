/**
 * The mascot characters a user can pick for Aura. Pure data, no React.
 *
 * THIS FILE EXISTS TWICE: here (web) and in apps/mobile/src/features/ai/mascot/characters.ts. The two apps are
 * separate packages, so keep both copies identical (ids, names and order). Each character has its own cropped
 * image per mood at apps/web/public/ai/mascot/characters/<id>/<mood>.png, duplicated into
 * apps/mobile/assets/images/mascot/characters/<id>/<mood>.png.
 */

import type { Mood } from "./face"

export type MascotId = "Robot" | "Luffy" | "Zoro" | "Sanji" | "Chopper"

export type MascotOption = { id: MascotId; name: string }

/** Order shown in the picker. "" has its own art; the rest currently reuse it as a placeholder. */
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

export function moodImage(mascot: MascotId, mood: Mood): string {
  return `/ai/mascot/characters/${mascot}/${mood}.png`
}
