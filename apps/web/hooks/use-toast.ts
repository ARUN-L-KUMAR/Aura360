"use client"

import { toast as sonnerToast } from "sonner"

/**
 * Compatibility layer: older components call `toast({ title, description, variant })`.
 * Everything now goes through sonner, the only toaster mounted in app/layout.tsx.
 */
type ToastInput = {
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  duration?: number
}

function toast({ title, description, variant, duration }: ToastInput) {
  const message = title ?? description ?? ""
  const options = { duration, ...(title && description ? { description } : {}) }
  const id = variant === "destructive" ? sonnerToast.error(message, options) : sonnerToast(message, options)
  return { id, dismiss: () => sonnerToast.dismiss(id) }
}

function useToast() {
  return { toast, dismiss: (id?: string | number) => sonnerToast.dismiss(id) }
}

export { useToast, toast }
