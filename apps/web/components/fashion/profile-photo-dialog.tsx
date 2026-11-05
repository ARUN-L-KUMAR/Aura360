"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { AlertTriangle, Camera, Loader2, Lock, RotateCcw, Sparkles, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ComboInput } from "./combo-input"
import { CameraCaptureDialog } from "./camera-capture-dialog"
import {
  PHOTO_FIELDS,
  PHOTO_FIELD_LABELS,
  PHOTO_FIELD_OPTIONS,
  type Confidence,
  type PhotoAnalysis,
  type PhotoField,
} from "@/lib/fashion/photo-analysis"
import type { FashionProfileData } from "@/lib/fashion/profile"

interface ProfilePhotoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** What's currently in the profile, to show what a suggestion would replace */
  current: FashionProfileData
  /** Called with only the fields the user ticked */
  onApply: (changes: Partial<FashionProfileData>) => void
}

const CONSENT_KEY = "aura360:photo-analysis-consent"
const MAX_SIDE = 1024

const CONFIDENCE_STYLE: Record<Confidence, { label: string; className: string }> = {
  likely: { label: "Likely", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  possible: { label: "Possible", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  unsure: { label: "Unsure", className: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
}

/** Shrinks the photo and re-encodes it as JPEG. This also drops hidden EXIF data (location, device) before upload. */
async function prepareImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL("image/jpeg", 0.85)
}

type Stage = "intro" | "analyzing" | "review"
type Row = { field: PhotoField; value: string; confidence: Confidence; selected: boolean }

export function ProfilePhotoDialog({ open, onOpenChange, current, onApply }: ProfilePhotoDialogProps) {
  const [stage, setStage] = useState<Stage>("intro")
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<PhotoAnalysis | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [cameraOpen, setCameraOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Reset every time it opens. The photo itself is never kept: it only exists during the request.
  useEffect(() => {
    if (!open) return
    setStage("intro")
    setError(null)
    setAnalysis(null)
    setRows([])
    try {
      setConsent(localStorage.getItem(CONSENT_KEY) === "1")
    } catch {
      setConsent(false)
    }
  }, [open])

  const rememberConsent = (value: boolean) => {
    setConsent(value)
    try {
      if (value) localStorage.setItem(CONSENT_KEY, "1")
      else localStorage.removeItem(CONSENT_KEY)
    } catch {
      // storage unavailable: the checkbox still works for this session
    }
  }

  const analyze = async (file: File) => {
    setError(null)
    setStage("analyzing")
    try {
      let image: string
      try {
        image = await prepareImage(file)
      } catch {
        throw new Error("Couldn't read that image. Try a JPEG or PNG photo.")
      }

      const response = await fetch("/api/fashion/profile/analyze-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Couldn't analyze the photo")

      const result = data.analysis as PhotoAnalysis
      setAnalysis(result)
      setRows(
        PHOTO_FIELDS.filter((f) => result.suggestions[f]).map((field) => ({
          field,
          value: result.suggestions[field]!.value,
          confidence: result.suggestions[field]!.confidence,
          selected: result.suggestions[field]!.confidence !== "unsure", // guesses start unticked
        }))
      )
      setStage("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't analyze the photo")
      setStage("intro")
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file")
      return
    }
    void analyze(file)
  }

  const update = (field: PhotoField, changes: Partial<Row>) => setRows((prev) => prev.map((r) => (r.field === field ? { ...r, ...changes } : r)))

  const selected = rows.filter((r) => r.selected && r.value.trim())
  const missing = PHOTO_FIELDS.filter((f) => !analysis?.suggestions[f]).map((f) => PHOTO_FIELD_LABELS[f].toLowerCase())

  const apply = () => {
    const changes: Record<string, string> = {}
    selected.forEach((r) => (changes[r.field] = r.value.trim()))
    onApply(changes as Partial<FashionProfileData>)
    toast.success(`Filled in ${selected.length} detail${selected.length === 1 ? "" : "s"}. Review them, then press Save.`)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Fill in from a photo
            </DialogTitle>
            <DialogDescription>
              We read your skin tone, hair, facial hair and build from a photo and suggest them. You decide what to keep.
            </DialogDescription>
          </DialogHeader>

          {stage === "intro" && (
            <div className="space-y-4">
              <ul className="space-y-1.5 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                <li>• Use natural daylight, since warm indoor lights and filters change skin tone</li>
                <li>• Face and body visible, no cap, sunglasses or heavy filter</li>
                <li>• Just you, against a plain background if you can</li>
              </ul>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
                <Checkbox checked={consent} onCheckedChange={(v) => rememberConsent(v === true)} className="mt-0.5" />
                <span className="text-xs leading-relaxed">
                  <span className="flex items-center gap-1 font-bold">
                    <Lock className="h-3 w-3" /> Your photo stays private
                  </span>
                  <span className="text-muted-foreground">
                    I understand the photo is sent to Google&apos;s AI (Gemini) to read these details. It is not saved anywhere, and it is
                    resized and stripped of location data before it is sent.
                  </span>
                </span>
              </label>

              {error && (
                <p className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" disabled={!consent} onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" /> Upload photo
                </Button>
                <Button type="button" variant="outline" disabled={!consent} onClick={() => setCameraOpen(true)}>
                  <Camera className="mr-2 h-4 w-4" /> Take photo
                </Button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
            </div>
          )}

          {stage === "analyzing" && (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              Reading your photo… this takes a few seconds
            </div>
          )}

          {stage === "review" && analysis && (
            <div className="space-y-4">
              {!analysis.personVisible ? (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  We couldn&apos;t see a person in that photo. Try one where you&apos;re clearly visible.
                </div>
              ) : rows.length === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Nothing could be read clearly from that photo.{analysis.qualityNote ? ` ${analysis.qualityNote}.` : " Try better light and a clearer view."}
                </div>
              ) : (
                <>
                  {analysis.quality !== "good" && analysis.qualityNote && (
                    <p className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {analysis.qualityNote}
                    </p>
                  )}

                  <div className="divide-y rounded-lg border">
                    {rows.map((row) => {
                      const style = CONFIDENCE_STYLE[row.confidence]
                      const existing = current[row.field]
                      return (
                        <div key={row.field} className="flex items-center gap-3 p-3">
                          <Checkbox
                            checked={row.selected}
                            onCheckedChange={(v) => update(row.field, { selected: v === true })}
                            aria-label={`Use suggested ${PHOTO_FIELD_LABELS[row.field]}`}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-widest">{PHOTO_FIELD_LABELS[row.field]}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.className}`}>{style.label}</span>
                            </div>
                            <ComboInput
                              value={row.value}
                              onChange={(value) => update(row.field, { value, selected: value.trim() ? true : row.selected })}
                              options={PHOTO_FIELD_OPTIONS[row.field]}
                              placeholder="Pick or type"
                            />
                            {existing && String(existing).toLowerCase() !== row.value.toLowerCase() && (
                              <p className="text-[11px] text-muted-foreground">Currently saved: {String(existing)}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {missing.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">Couldn&apos;t tell from this photo: {missing.join(", ")}.</p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    &quot;Unsure&quot; items are unticked. Nothing is saved until you press Save on the My Fit page.
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {stage === "review" ? (
              <>
                <Button type="button" variant="outline" onClick={() => setStage("intro")}>
                  <RotateCcw className="mr-2 h-4 w-4" /> Try another photo
                </Button>
                <Button type="button" onClick={apply} disabled={selected.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                  Use {selected.length || ""} selected
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={stage === "analyzing"}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        onCapture={(file) => {
          setCameraOpen(false)
          void analyze(file)
        }}
        onUnavailable={() => {
          setCameraOpen(false)
          fileRef.current?.click()
        }}
      />
    </>
  )
}
