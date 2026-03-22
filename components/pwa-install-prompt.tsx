"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Smartphone, X, Download, Share2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    const checkStandalone = () => {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes("android-app://")
      )
    }

    setIsStandalone(checkStandalone())

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Show the install button
      setShowPrompt(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === "accepted") {
      console.log("User accepted the install prompt")
    } else {
      console.log("User dismissed the install prompt")
    }
    
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  // If already installed or prompt dismissed/not available, don't show anything
  if (isStandalone || !showPrompt) {
    return null
  }

  return (
    <Card className="bg-primary/5 border-primary/20 mb-8 overflow-hidden relative group">
      <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-all group-hover:bg-primary/20" />
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">Install Aura360 for easy sharing</h3>
              <p className="text-sm text-muted-foreground max-w-md mt-1 font-medium">
                Install the app on your phone to see "Aura360" in the share menu of apps like GPay, PhonePe, and more.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
              onClick={handleInstallClick}
              className="flex-1 md:flex-none h-11 px-6 gap-2 font-bold rounded-xl shadow-lg shadow-primary/20"
            >
              <Download className="h-4 w-4" />
              Install App
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowPrompt(false)}
              className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Simple Tip */}
        <div className="mt-4 pt-4 border-t border-primary/10 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary/60">
          <Share2 className="h-3 w-3" />
          Tip: Once installed, share transaction text from any UPI app to Aura360.
        </div>
      </CardContent>
    </Card>
  )
}
