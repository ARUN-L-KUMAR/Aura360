"use client"

/** Lets the floating launcher be dragged anywhere on screen; the spot is remembered per browser. */

import { useCallback, useEffect, useRef, useState } from "react"

const STORAGE_KEY = "aura360_widget_pos"
/** Rough footprint of the launcher (mascot + label), used to keep it fully on screen. */
const WIDTH = 116
const HEIGHT = 116
const MARGIN = 8

export type WidgetPos = { x: number; y: number }

function clamp(pos: WidgetPos): WidgetPos {
  if (typeof window === "undefined") return pos
  const maxX = Math.max(MARGIN, window.innerWidth - WIDTH - MARGIN)
  const maxY = Math.max(MARGIN, window.innerHeight - HEIGHT - MARGIN)
  return { x: Math.min(Math.max(pos.x, MARGIN), maxX), y: Math.min(Math.max(pos.y, MARGIN), maxY) }
}

function defaultPos(): WidgetPos {
  if (typeof window === "undefined") return { x: 0, y: 0 }
  return clamp({ x: window.innerWidth - WIDTH - 12, y: window.innerHeight - HEIGHT - 20 })
}

/**
 * Drag state for the floating launcher. `onPointerDown` goes on the draggable element; `wasDragged()` tells the
 * click handler whether the pointer actually moved, so a drag doesn't also open the chat panel.
 */
export function useDraggableWidget() {
  const [pos, setPos] = useState<WidgetPos | null>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const start = useRef({ x: 0, y: 0, px: 0, py: 0 })

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setPos(clamp(JSON.parse(stored)))
        return
      }
    } catch {
      // Fall through to the default corner.
    }
    setPos(defaultPos())
  }, [])

  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : p))
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  const save = useCallback((next: WidgetPos) => {
    setPos(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Not persisted: the position still applies for the rest of this session.
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!pos) return
      dragging.current = true
      moved.current = false
      start.current = { x: pos.x, y: pos.y, px: e.clientX, py: e.clientY }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [pos]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - start.current.px
      const dy = e.clientY - start.current.py
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
      save(clamp({ x: start.current.x + dx, y: start.current.y + dy }))
    },
    [save]
  )

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  return {
    pos,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    /** True if the pointer moved enough to count as a drag rather than a tap. Reset on the next pointerdown. */
    wasDragged: () => moved.current,
  }
}
