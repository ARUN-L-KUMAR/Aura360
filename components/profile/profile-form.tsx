"use client"

import type React from "react"
import { useRef, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { Camera, Upload, X, User as UserIcon, Loader2, Mail, Calendar, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useSession, signOut } from "next-auth/react"

interface User {
  id: string
  email: string | null
  createdAt?: Date
  updatedAt?: Date
}

interface Profile {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  coverImage: string | null
  createdAt: string
  updatedAt: string
}

interface ProfileFormProps {
  user: User
  profile: Profile | null
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile?.fullName || "")
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || "")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatarUrl || null)
  const [coverUrl, setCoverUrl] = useState(profile?.coverImage || "")
  const [coverPreview, setCoverPreview] = useState<string | null>(profile?.coverImage || null)
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { update } = useSession()

  // Get initials for avatar fallback
  const getInitials = () => {
    if (fullName) {
      return fullName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return user.email?.charAt(0).toUpperCase() || "U"
  }

  // Handle file selection
  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB")
      return
    }

    setIsUploading(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Cloudinary via API
      const formData = new FormData()
      formData.append("avatar", file)

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload avatar")
      }

      const data = await response.json()
      setAvatarUrl(data.avatarUrl)
      
      // Update session to sync navbar
      await update({ image: data.avatarUrl })
      
      toast.success("Avatar uploaded successfully")
    } catch (error) {
      console.error("Error uploading:", error)
      toast.error("Failed to upload image")
      setAvatarPreview(profile?.avatarUrl || null)
    } finally {
      setIsUploading(false)
    }
  }, [profile?.avatarUrl])

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }, [handleFileSelect])

  // Handle file input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Handle cover selection
  const handleCoverSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Cover image must be less than 10MB")
      return
    }

    setIsUploadingCover(true)

    try {
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setCoverPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Cloudinary via API
      const formData = new FormData()
      formData.append("cover", file)

      const response = await fetch("/api/profile/cover", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload cover")
      }

      const data = await response.json()
      setCoverUrl(data.coverUrl)
      
      // Update session (though cover is not in navbar, it's good practice)
      await update({ coverImage: data.coverUrl })
      
      toast.success("Cover image updated")
    } catch (error) {
      console.error("Error uploading cover:", error)
      toast.error("Failed to upload cover")
      setCoverPreview(profile?.coverImage || null)
    } finally {
      setIsUploadingCover(false)
    }
  }, [profile?.coverImage])

  // Remove avatar
  const handleRemoveAvatar = () => {
    setAvatarUrl("")
    setAvatarPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Remove cover
  const handleRemoveCover = () => {
    setCoverUrl("")
    setCoverPreview(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/profile", {
        method: profile ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName,
          avatarUrl: avatarUrl || null,
          coverImage: coverUrl || null,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      toast.success(profile ? "Profile updated successfully!" : "Profile created successfully!")
      
      // Sync names and images across the app session
      await update({ 
        name: fullName,
        image: avatarUrl || undefined
      })
      
      router.refresh()
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Failed to update profile")
    }

    setIsLoading(false)
  }

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="space-y-8">
      {/* Profile Header Card */}
      <Card className="backdrop-blur-xl bg-card/40 border-border overflow-hidden shadow-2xl relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Header Background */}
        <div className="h-48 bg-gradient-to-br from-primary via-blue-600 to-violet-600 relative overflow-hidden group/cover">
           {coverPreview || coverUrl ? (
             <img 
               src={coverPreview || coverUrl} 
               alt="Cover" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover/cover:scale-105" 
             />
           ) : (
             <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
           )}
           <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-background/40 to-transparent" />
           
           {/* Cover Upload Overlay */}
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                 <Button 
                   type="button"
                   variant="outline"
                   size="sm"
                   className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-black uppercase tracking-widest text-[10px]"
                   onClick={() => coverInputRef.current?.click()}
                   disabled={isUploadingCover}
                 >
                   {isUploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                   {isUploadingCover ? "Uplinking..." : "Update Backdrop"}
                 </Button>
                 {(coverPreview || coverUrl) && !isUploadingCover && (
                   <Button 
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="text-white/60 hover:text-white font-bold text-[10px] uppercase"
                     onClick={handleRemoveCover}
                   >
                     Reset to Default
                   </Button>
                 )}
              </div>
           </div>
           
           <input
             ref={coverInputRef}
             type="file"
             accept="image/*"
             className="hidden"
             onChange={(e) => {
               const file = e.target.files?.[0]
               if (file) handleCoverSelect(file)
             }}
           />
        </div>
        
        {/* Profile Info */}
        <div className="px-8 pb-8 relative">
          {/* Avatar Section */}
          <div className="relative -mt-20 mb-6 inline-block">
            <div
              className={cn(
                "relative w-40 h-40 rounded-3xl border-[6px] border-background bg-background shadow-2xl transition-all duration-500 group-avatar hover:scale-[1.02]",
                isDragging && "ring-4 ring-primary ring-offset-4"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Avatar className="w-full h-full rounded-2xl overflow-hidden">
                <AvatarImage 
                  src={avatarPreview || avatarUrl} 
                  alt={fullName || "Profile"} 
                  className="object-cover"
                />
                <AvatarFallback className="text-4xl font-black bg-secondary text-primary">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload Overlay */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-2xl opacity-0 hover:opacity-100 transition-all duration-300 cursor-pointer backdrop-blur-sm"
              >
                {isUploading ? (
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="w-10 h-10 text-white" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Update Bio-ID</span>
                  </div>
                )}
              </button>
              
              {/* Remove button */}
              {(avatarPreview || avatarUrl) && !isUploading && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  className="absolute -top-3 -right-3 w-10 h-10 rounded-xl bg-destructive text-destructive-foreground flex items-center justify-center shadow-xl hover:bg-destructive/90 transition-all hover:rotate-90"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
          
          {/* User Name & Email */}
          <div className="space-y-2">
            <h2 className="text-4xl font-black tracking-tighter">
              {fullName || "Anonymous User"}
            </h2>
            <div className="flex items-center gap-4">
               <p className="text-sm font-bold text-muted-foreground flex items-center gap-2 bg-secondary/50 py-1 px-3 rounded-full border border-border">
                 <Mail className="w-4 h-4 text-primary" />
                 {user.email}
               </p>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary animate-pulse">
                  Level 1 Intelligence
               </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information Case */}
        <Card className="backdrop-blur-xl bg-card/40 border-border shadow-xl overflow-hidden">
          <CardHeader className="pb-8">
            <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                 <UserIcon className="w-4 h-4 text-primary" />
              </div>
              Identity Parameters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="full-name" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    Display Title
                  </Label>
                  <Input
                    id="full-name"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12 bg-secondary/30 border-border focus-visible:ring-primary/20 transition-all font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    Primary Link (ReadOnly)
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user.email || ""} 
                    disabled 
                    className="h-12 bg-secondary/10 border-border/20 text-muted-foreground/50 cursor-not-allowed font-medium" 
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar-url" className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">
                    Remote Visual Uplink (URL)
                  </Label>
                  <Input
                    id="avatar-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value)
                      setAvatarPreview(e.target.value)
                    }}
                    className="h-12 bg-secondary/30 border-border focus-visible:ring-primary/20 transition-all font-bold"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full h-12 bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-xl shadow-primary/20 font-black uppercase tracking-[0.1em] text-xs"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Syncing...
                  </div>
                ) : (
                  "Update Parameters"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* System & Access Case */}
        <div className="space-y-8">
           <Card className="backdrop-blur-xl bg-card/40 border-border shadow-xl overflow-hidden">
             <CardHeader className="pb-8">
               <CardTitle className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-3 text-muted-foreground">
                 <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-blue-500" />
                 </div>
                 Temporal Log
               </CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Initialized On</p>
                      <p className="text-sm font-bold">
                        {profile?.createdAt 
                          ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                              year: "numeric", month: "long", day: "numeric"
                            })
                          : "Unknown"}
                      </p>
                   </div>
                   <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   </div>
                </div>

                <div className="p-4 rounded-xl bg-secondary/30 border border-border flex items-center justify-between">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Last Synchronization</p>
                      <p className="text-sm font-bold">
                        {profile?.updatedAt 
                          ? new Date(profile.updatedAt).toLocaleTimeString("en-US", {
                              hour: "2-digit", minute: "2-digit"
                            }) + " • " + new Date(profile.updatedAt).toLocaleDateString("en-US", {
                               month: "short", day: "numeric"
                            })
                          : "In Session"}
                      </p>
                   </div>
                   <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Loader2 className="w-5 h-5" />
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="backdrop-blur-xl bg-card/40 border-destructive/20 shadow-xl overflow-hidden transition-all hover:border-destructive hover:bg-destructive/5 group">
             <CardContent className="p-6">
                <div className="flex flex-col items-center gap-4">
                   <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive transition-transform group-hover:scale-110">
                      <LogOut className="w-8 h-8" />
                   </div>
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive mb-1">Termination Sequence</p>
                      <p className="text-xs font-bold text-muted-foreground/60 max-w-[200px]">End the current identity session and release all memory handles.</p>
                   </div>
                   <Button 
                    variant="outline" 
                    onClick={handleSignOut}
                    className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive hover:text-white font-black uppercase tracking-widest text-xs transition-all"
                   >
                     Disconnect Session
                   </Button>
                </div>
             </CardContent>
           </Card>
        </div>
      </div>
    </div>
  )
}
