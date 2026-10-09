"use client"

import { useSyncExternalStore } from "react"

export interface OfflineItem {
  id: number
  kind: "pending" | "failed"
  label: string
  createdAt: number
  error?: string
}

export interface OfflineState {
  online: boolean
  pending: number
  failed: number
  items: OfflineItem[]
}

const SERVER_STATE: OfflineState = { online: true, pending: 0, failed: 0, items: [] }
let state: OfflineState = SERVER_STATE
const listeners = new Set<() => void>()

/** Small shared store: the manager writes what the service worker reports, the banner reads it. */
export function setOfflineState(patch: Partial<OfflineState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export function useOfflineState(): OfflineState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
    () => SERVER_STATE
  )
}
