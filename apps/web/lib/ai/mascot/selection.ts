"use client"

/**
 * Which mascot the user picked for Aura, shared across every place the mascot is shown (the launcher button,
 * the panel header, settings) without prop-drilling. Lives in localStorage; fails open to the default mascot.
 *
 * THIS FILE EXISTS TWICE: here (web) and in apps/mobile/src/features/ai/mascot/selection.ts. The storage
 * mechanism differs (localStorage vs AsyncStorage), but the shape and behaviour should match.
 */

import { useSyncExternalStore } from "react"

import { DEFAULT_MASCOT, isMascotId, type MascotId } from "./characters"

const STORAGE_KEY = "aura360_mascot_id"

let current: MascotId = DEFAULT_MASCOT
const listeners = new Set<() => void>()

function load() {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (isMascotId(stored)) current = stored
  } catch {
    // Storage unavailable: stay on the default mascot.
  }
}
load()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function setMascot(id: MascotId) {
  current = id
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // Not persisted: the choice still applies for the rest of this session.
  }
  emit()
}

/** The selected mascot, and a setter. Updates everywhere it's used, including other tabs. */
export function useMascot(): [MascotId, (id: MascotId) => void] {
  const id = useSyncExternalStore(subscribe, () => current, () => DEFAULT_MASCOT)
  return [id, setMascot]
}
