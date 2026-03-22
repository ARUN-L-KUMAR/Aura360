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
      <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-12 h-12 rounded-lg flex items-center justify-center border",
            iconBgColor
          )}>
            <Icon className={cn("w-6 h-6", iconColor)} />
          </div>
          <div>
            <div className="px-2 py-0.5 rounded bg-secondary border text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-fit mb-1">
              Module
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="text-sm font-medium text-muted-foreground">{description}</p>
          </div>
        </div>
        
        {/* Action buttons (Add button, etc.) */}
        {children && (
          <div className="flex items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </>
  )
}
