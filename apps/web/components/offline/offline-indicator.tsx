"use client"

import { useState } from "react"
import { CloudUpload, RefreshCw, Trash2, WifiOff, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { postToWorker } from "@/lib/offline/client"
import { useOfflineState } from "@/lib/offline/store"

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Slim banner under the top bar: shows when you're offline, what is waiting to sync, and anything that couldn't be saved. */
export function OfflineIndicator() {
  const { online, pending, failed, items } = useOfflineState()
  const [open, setOpen] = useState(false)

  if (online && pending === 0 && failed === 0) return null

  const tone = failed > 0 ? "bg-destructive/10 text-destructive border-destructive/30" : !online ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30" : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"

  return (
    <>
      <div role="status" className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-b px-4 py-2 text-xs font-medium ${tone}`}>
        {failed > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : !online ? <WifiOff className="h-3.5 w-3.5" /> : <CloudUpload className="h-3.5 w-3.5" />}
        <span>
          {failed > 0
            ? `${plural(failed, "entry couldn't", "entries couldn't")} be saved`
            : !online
              ? pending > 0
                ? `You're offline · ${plural(pending, "entry", "entries")} waiting to sync`
                : "You're offline · logging still works"
              : `Syncing ${plural(pending, "entry", "entries")}…`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {online && pending > 0 && (
            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => void postToWorker({ type: "replay" })}>
              <RefreshCw className="mr-1 h-3 w-3" /> Sync now
            </Button>
          )}
          {(pending > 0 || failed > 0) && (
            <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setOpen(true)}>
              Review
            </Button>
          )}
        </span>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Offline entries</DialogTitle>
            <DialogDescription>Saved on this device. Waiting ones are sent automatically; the rest were rejected by the server.</DialogDescription>
          </DialogHeader>

          {items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {items.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.kind === "failed" ? <span className="text-destructive">{item.error ?? "Rejected"}</span> : "Waiting to sync"} ·{" "}
                      {new Date(item.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Discard ${item.label}`}
                    onClick={() => void postToWorker({ type: "discard", id: item.id, store: item.kind === "failed" ? "failed" : "queue" })}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {failed > 0 && (
            <Button type="button" variant="outline" onClick={() => void postToWorker({ type: "retry-failed" })}>
              <RefreshCw className="mr-2 h-4 w-4" /> Retry the rejected ones
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
