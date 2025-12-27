"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { toast } from "sonner"
import { getApiUrl } from "@/lib/utils/api"

interface ImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
  placeholder?: string
}

export function ImageUpload({ value, onChange, label = "Image", placeholder = "https://example.com/image.jpg" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file')
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB')
        return
      }

      uploadImage(file)
    }
  }

  const handleUrlChange = (url: string) => {
    onChange(url)
    setPreview(url)
  }

  const clearImage = () => {
    onChange("")
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>{label}</Label>

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
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

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
      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full max-w-sm h-48 object-cover rounded-lg border"
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

      {/* Instructions */}
      <div className="text-sm text-muted-foreground">
        <p>• Upload images directly or paste a URL</p>
        <p>• Supported formats: JPG, PNG, GIF, WebP</p>
        <p>• Maximum file size: 5MB</p>
      </div>
    </div>
  )
}