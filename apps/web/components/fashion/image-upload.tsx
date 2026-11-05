"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Sparkles, Undo2, Loader2, Camera } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/utils/api"
import { CameraCaptureDialog } from "./camera-capture-dialog"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
  /** Hide the inline preview when the parent shows the image elsewhere (e.g. a side panel) */
  hidePreview?: boolean
  /** Tighter layout: short button labels and no instruction text */
  compact?: boolean
}

export function ImageUpload({ value, onChange, label = "Image", placeholder = "https://example.com/image.jpg", hidePreview = false, compact = false }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value)

  // Keep the preview in sync when the parent sets the URL (e.g. auto-filled from a product link)
  useEffect(() => {
    setPreview(value || null)
  }, [value])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null) // native camera picker fallback (phones)
  const [cameraOpen, setCameraOpen] = useState(false)

  // AI enhance: `enhanced` is a pending result awaiting Use/Discard;
  // `originalUrl` is what to restore after a result has been applied.
  const [enhancing, setEnhancing] = useState(false)
  const [enhanced, setEnhanced] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)

  const enhanceImage = async () => {
    if (!value) return
    setEnhancing(true)
    try {
      const response = await fetch(getApiUrl('/api/fashion/enhance-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: value }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Failed to enhance image')
      setEnhanced(data.url)
    } catch (error) {
      console.error('Error enhancing image:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to enhance image')
    } finally {
      setEnhancing(false)
    }
  }

  const useEnhanced = () => {
    if (!enhanced) return
    setOriginalUrl(value)
    onChange(enhanced)
    setPreview(enhanced)
    setEnhanced(null)
    toast.success('Using the enhanced photo')
  }

  const revertToOriginal = () => {
    if (!originalUrl) return
    onChange(originalUrl)
    setPreview(originalUrl)
    setOriginalUrl(null)
  }

  const uploadImage = async (file: File) => {
    try {
      setUploading(true)

      // Convert file to base64
      const reader = new FileReader()
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // Upload to Cloudinary via API
      const response = await fetch(getApiUrl('/api/fashion/upload-image'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64Data,
          folder: 'fashion'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      
      onChange(data.url)
      setPreview(data.url)
      setEnhanced(null)
      setOriginalUrl(null)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const validateAndUpload = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    uploadImage(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndUpload(file)
    e.target.value = '' // allow picking the same file again
  }

  const handleUrlChange = (url: string) => {
    onChange(url)
    setPreview(url)
    setEnhanced(null)
    setOriginalUrl(null)
  }

  const clearImage = () => {
    onChange("")
    setPreview(null)
    setEnhanced(null)
    setOriginalUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        {!compact && <Label>{label}</Label>}

        {/* Upload Button */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? "Uploading..." : compact ? "Upload" : "Upload Image"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCameraOpen(true)}
            disabled={uploading}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            {compact ? "Camera" : "Take Photo"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <CameraCaptureDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onCapture={validateAndUpload}
          onUnavailable={() => {
            // No live camera (e.g. insecure origin): fall back to the device's native camera picker
            setCameraOpen(false)
            cameraInputRef.current?.click()
          }}
        />

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="flex-1"
          />
          {value && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={clearImage}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview && !hidePreview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-sm max-h-72 object-contain rounded-lg border bg-muted"
            onError={() => setPreview(null)}
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={clearImage}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* AI enhance */}
      {value && !enhanced && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={enhanceImage} disabled={enhancing || uploading}>
            {enhancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {enhancing ? "Enhancing... (~15s)" : "Enhance with AI"}
          </Button>
          {originalUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={revertToOriginal}>
              <Undo2 className="w-4 h-4 mr-2" />
              Revert to original
            </Button>
          )}
        </div>
      )}

      {enhanced && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="grid grid-cols-2 gap-3">
            <figure className="space-y-1">
              <img src={value} alt="Original" className="aspect-[3/4] w-full rounded-md border bg-muted object-contain" />
              <figcaption className="text-center text-xs text-muted-foreground">Original</figcaption>
            </figure>
            <figure className="space-y-1">
              <img src={enhanced} alt="AI enhanced" className="aspect-[3/4] w-full rounded-md border bg-white object-contain" />
              <figcaption className="text-center text-xs text-muted-foreground">AI enhanced</figcaption>
            </figure>
          </div>
          <p className="text-xs text-muted-foreground">
            AI can subtly change small details such as logos, text or textures. Check it against your item before using it.
          </p>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={useEnhanced}>Use enhanced</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setEnhanced(null)}>Discard</Button>
            <Button type="button" variant="ghost" size="sm" onClick={enhanceImage} disabled={enhancing}>
              {enhancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Try again
            </Button>
          </div>
        </div>
      )}

      {/* Instructions */}
      {!compact && (
      <div className="text-sm text-muted-foreground">
        <p>• Upload, take a photo, or paste a URL</p>
        <p>• Supported formats: JPG, PNG, GIF, WebP</p>
        <p>• Maximum file size: 5MB</p>
      </div>
      )}
    </div>
  )
}
