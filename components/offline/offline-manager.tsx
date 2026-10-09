"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { offlineSupportEnabled, postToWorker, registerWorker } from "@/lib/offline/client"
import { setOfflineState, useOfflineState } from "@/lib/offline/store"

/** Registers the service worker, tells it who is signed in, and turns its messages into toasts and banner state. */
export function OfflineManager() {
  const { data: session } = useSession()
  const router = useRouter()
  const userId = session?.user?.id
  const { pending, online } = useOfflineState()

  useEffect(() => {
    if (!offlineSupportEnabled()) return
    void registerWorker()
  }, [])

  // Once we know who is signed in, hand that to the worker and send anything still waiting from earlier
  useEffect(() => {
    if (!offlineSupportEnabled() || !userId) return
    void (async () => {
      await postToWorker({ type: "user", id: userId })
      await postToWorker({ type: "status" })
      if (navigator.onLine) await postToWorker({ type: "replay" })
    })()
  }, [userId])

  useEffect(() => {
    if (!offlineSupportEnabled()) return

    setOfflineState({ online: navigator.onLine })

    const onMessage = (event: MessageEvent) => {
      const msg = event.data as { type?: string; [key: string]: any } | undefined
      if (!msg?.type) return

      if (msg.type === "status") {
        setOfflineState({ pending: msg.pending, failed: msg.failed, items: msg.items })
      } else if (msg.type === "queued") {
        toast.info("Saved offline", { description: `${msg.label}. It will sync when you're back online.` })
      } else if (msg.type === "synced") {
        if (msg.sent > 0) {
          toast.success(`${msg.sent} offline ${msg.sent === 1 ? "entry" : "entries"} synced`)
          router.refresh()
        }
        if (msg.failed > 0) {
          toast.error(`${msg.failed} ${msg.failed === 1 ? "entry" : "entries"} couldn't be saved`, { description: "Open the banner at the top to review them." })
        }
        if (msg.authRequired) toast.warning("Sign in again to finish syncing your offline entries")
      }
    }

    const goOnline = () => {
      setOfflineState({ online: true })
      void postToWorker({ type: "replay" })
    }
    const goOffline = () => {
      setOfflineState({ online: false })
      toast.info("You're offline", { description: "You can keep logging. Entries sync automatically." })
    }

    navigator.serviceWorker.addEventListener("message", onMessage)
    window.addEventListener("online", goOnline)
    window.addEventListener("offline", goOffline)
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void postToWorker({ type: "replay" })
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage)
      window.removeEventListener("online", goOnline)
      window.removeEventListener("offline", goOffline)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [router])

  // Safety net for browsers without Background Sync: keep trying while something is waiting
  useEffect(() => {
    if (!offlineSupportEnabled() || pending === 0 || !online) return
    const timer = setInterval(() => void postToWorker({ type: "replay" }), 45_000)
    return () => clearInterval(timer)
  }, [pending, online])

  return null
}
