"use client"

import { useEffect, useState } from "react"
import { ImageIcon, X } from "lucide-react"

interface FashionImagePreviewProps {
  src: string
  name?: string
  brand?: string
  price?: string
  /** Extra photos (besides `src`). Click one to make it the main photo. */
  extras?: string[]
  onSelectExtra?: (url: string) => void
  onRemoveExtra?: (url: string) => void
  /** Render as a normal block (no sticky/ordering), for use inside a column the parent already positions */
  inline?: boolean
}

/**
 * Side preview for the add/edit dialogs. Shows the whole photo (no cropping) in a portrait
 * frame, the way shops like Myntra present it, with a short summary underneath.
 */
export function FashionImagePreview({ src, name, brand, price, extras = [], onSelectExtra, onRemoveExtra, inline = false }: FashionImagePreviewProps) {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [src])

  const hasImage = Boolean(src) && !failed
  const priceNumber = price ? Number.parseFloat(price) : Number.NaN

  return (
    // On phones the panel only appears once there is a photo, and sits above the form
    <aside
      className={`${inline ? "" : "order-first md:order-last md:sticky md:top-0 md:self-start"} ${hasImage ? "" : "hidden md:block"}`}
    >
      <div className="overflow-hidden rounded-xl border bg-muted">
        <div className="flex aspect-[3/4] max-h-72 w-full items-center justify-center md:max-h-none">
          {hasImage ? (
            <img
              src={src}
              alt={name || "Product preview"}
              className="h-full w-full object-contain"
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 text-center text-muted-foreground">
              <ImageIcon className="h-10 w-10 opacity-40" />
              <p className="text-xs">
                {failed ? "This image couldn't be loaded" : "Photo preview appears here. Paste a product link or upload a photo."}
              </p>
            </div>
          )}
        </div>
      </div>
      {hasImage && extras.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            More photos ({extras.length}) · click to make main
          </p>
          <div className="grid grid-cols-4 gap-2">
            {extras.map((url) => (
              <div key={url} className="group relative aspect-[3/4] overflow-hidden rounded-md border bg-muted">
                <button type="button" className="h-full w-full" onClick={() => onSelectExtra?.(url)} title="Use as main photo">
                  <img src={url} alt="" className="h-full w-full object-contain" loading="lazy" />
                </button>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => onRemoveExtra?.(url)}
                  className="absolute right-0.5 top-0.5 rounded bg-background/90 p-0.5 opacity-0 shadow transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {(name || brand || Number.isFinite(priceNumber)) && (
        <div className="mt-3 space-y-0.5 px-1">
          {brand && <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{brand}</p>}
          {name && <p className="line-clamp-2 text-sm font-semibold leading-snug">{name}</p>}
          {Number.isFinite(priceNumber) && <p className="text-sm font-bold">₹{priceNumber.toLocaleString("en-IN")}</p>}
        </div>
      )}
    </aside>
  )
}
