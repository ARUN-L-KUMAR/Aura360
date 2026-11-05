"use client"

/**
 * Talks to the service worker (public/sw.js). Everything here is safe to call anywhere: if the worker isn't
 * running (development, an unsupported browser) the calls quietly do nothing.
 */

export type WorkerMessage =
  | { type: "user"; id: string | null }
  | { type: "replay" }
  | { type: "status" }
  | { type: "discard"; id: number; store: "queue" | "failed" }
  | { type: "retry-failed" }
  | { type: "clear-caches" }

/** Off in `next dev` (a cached app shell makes development confusing). Set NEXT_PUBLIC_ENABLE_SW=1 to try it there. */
export function offlineSupportEnabled(): boolean {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return false
  return process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_ENABLE_SW === "1"
}

export async function registerWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!offlineSupportEnabled()) return null
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" })
  } catch (error) {
    console.warn("[Offline] service worker registration failed:", error)
    return null
  }
}

export async function postToWorker(message: WorkerMessage): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    const target = navigator.serviceWorker.controller ?? registration?.active
    target?.postMessage(message)
  } catch {
    // no worker: nothing to do
  }
}

/** Call on sign-out: forgets cached pages and data so the next person on this device can't see them. */
export async function clearOfflineCaches(): Promise<void> {
  await Promise.race([postToWorker({ type: "clear-caches" }), new Promise<void>((resolve) => setTimeout(resolve, 800))])
}
