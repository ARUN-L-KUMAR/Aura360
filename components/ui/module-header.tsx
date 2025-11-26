"use client"

import Link from "next/link"
import { ArrowLeft, Sparkles, Home, Activity, StickyNote, Dumbbell, Utensils, UtensilsCrossed, Shirt, Bookmark, Clock, DollarSign, LucideIcon } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { cn } from "@/lib/utils"

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  "sticky-note": StickyNote,
  "dumbbell": Dumbbell,
  "utensils": Utensils,
  "utensils-crossed": UtensilsCrossed,
  "shirt": Shirt,
  "bookmark": Bookmark,
  "sparkles": Sparkles,
  "clock": Clock,
  "dollar-sign": DollarSign,
}

interface ModuleHeaderProps {
  title: string
  description: string
  iconName: string
  iconBgColor: string
  iconColor: string
  children?: React.ReactNode // For action buttons like "Add" buttons
}

export function ModuleHeader({
  title,
  description,
  iconName,
  iconBgColor,
  iconColor,
  children,
}: ModuleHeaderProps) {
  const Icon = iconMap[iconName] || Sparkles

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b mb-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Back to Dashboard */}
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Link>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent hidden sm:inline">
                Aura360
              </span>
            </Link>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Link 
                href="/"
                className="p-2 rounded-lg hover:bg-muted transition-colors hidden sm:flex"
                title="Go to Home"
              >
                <Home className="w-4 h-4 text-muted-foreground" />
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Module Header */}
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center",
            iconBgColor
          )}>
            <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", iconColor)} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        
        {/* Action buttons (Add button, etc.) */}
        {children && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {children}
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          <Link 
            href="/"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Home className="w-5 h-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link 
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs">Dashboard</span>
          </Link>
          <Link 
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-4 py-2 text-teal-600 dark:text-teal-400"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-xs font-medium">Back</span>
          </Link>
        </div>
      </nav>
    </>
  )
}
