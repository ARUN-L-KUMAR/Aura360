"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Camera, RefreshCw, SwitchCamera } from "lucide-react"

interface CameraCaptureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
  /** Called when the live camera can't be used (no permission, no device, insecure context). */
  onUnavailable?: () => void
}

const MAX_SIDE = 1600

export function CameraCaptureDialog({ open, onOpenChange, onCapture, onUnavailable }: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // keep the latest callback without restarting the camera when the parent re-renders
  const onUnavailableRef = useRef(onUnavailable)
  onUnavailableRef.current = onUnavailable
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment")
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function start() {
      setError(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera isn't available in this browser.")
        onUnavailableRef.current?.()
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1920 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {})
        }
        setReady(true)
      } catch (err) {
        console.error("Camera error:", err)
        if (cancelled) return
        const denied = err instanceof DOMException && err.name === "NotAllowedError"
        setError(
          denied
            ? "Camera access was blocked. Allow it in your browser's site settings, or upload a photo instead."
            : "Couldn't start the camera. You can upload a photo instead."
        )
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, facingMode, stopStream])

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (!blob) return
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" }))
        onOpenChange(false)
      },
      "image/jpeg",
      0.9
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Take a photo</DialogTitle>
          <DialogDescription>Lay the item flat or hang it up with good light, then capture.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-black">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/80">{error}</div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
            />
          )}
          {!error && !ready && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Starting camera...
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!!error}
            onClick={() => setFacingMode((m) => (m === "environment" ? "user" : "environment"))}
          >
            <SwitchCamera className="mr-2 h-4 w-4" />
            Flip
          </Button>
          <Button type="button" onClick={capture} disabled={!ready || !!error}>
            <Camera className="mr-2 h-4 w-4" />
            Capture
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
