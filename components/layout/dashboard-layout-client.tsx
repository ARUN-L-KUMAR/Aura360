"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "./dashboard-sidebar"
import { Navbar } from "./navbar"

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex overflow-hidden opacity-0">
        <div className="flex-1 flex flex-col min-h-screen relative overflow-y-auto no-scrollbar">
          <main className="flex-1 pt-24 pb-12">
            {children}
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <DashboardSidebar 
        isCollapsed={isSidebarCollapsed} 
        setIsCollapsed={setIsSidebarCollapsed} 
      />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen relative overflow-y-auto no-scrollbar transition-all duration-300",
        "ml-0 lg:ml-64",
        isSidebarCollapsed && "lg:ml-[72px]"
      )}>
        <Navbar />
        <main className="flex-1 pb-32 lg:pb-12">
          {children}
        </main>
      </div>
    </div>
  )
}
