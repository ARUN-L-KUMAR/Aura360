"use client"

import { useSyncExternalStore } from "react"
import type { FashionProfileData } from "@/lib/fashion/profile"

/**
 * The signed-in user's saved fit profile, loaded once and shared by every component that needs it
 * (the add/edit form, item cards, the detail view). Returns null until loaded, or when none is saved.
 */

let current: FashionProfileData | null = null
let started = false
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((l) => l())

function load() {
  if (started) return
  started = true
  fetch("/api/fashion/profile")
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      current = (data?.profile as FashionProfileData | null) ?? null
      emit()
    })
    .catch(() => {
      started = false // try again next time something asks
    })
}

/** Call after the profile is saved so everything showing it updates immediately. */
export function setFashionProfileCache(profile: FashionProfileData | null) {
  current = profile
  started = true
  emit()
}

export function useFashionProfile(): FashionProfileData | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      load()
      return () => listeners.delete(listener)
    },
    () => current,
    () => null
  )
}
