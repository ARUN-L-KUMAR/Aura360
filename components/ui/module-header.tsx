"use client"

import Link from "next/link"
import { ArrowLeft, Sparkles, Home, Activity, StickyNote, Dumbbell, Utensils, UtensilsCrossed, Shirt, Bookmark, Clock, DollarSign, User, Settings, LucideIcon } from "lucide-react"
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
  "user": User,
  "settings": Settings,
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

      {/* Module Header */}
      <div className="mb-6 sm:mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={cn(
            "w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center border shadow-sm",
            iconBgColor
          )}>
            <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", iconColor)} />
          </div>
          <div className="flex-1">
            <div className="px-1.5 sm:px-2 py-0.5 rounded bg-secondary border text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-fit mb-0.5 sm:mb-1">
              Module
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground leading-none">{title}</h1>
            <p className="text-xs sm:text-sm font-medium text-muted-foreground mt-1 line-clamp-1 sm:line-clamp-none">{description}</p>
          </div>
        </div>
        
        {/* Action buttons (Add button, etc.) */}
        {children && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {children}
          </div>
        )}
      </div>
    </>
  )
}
