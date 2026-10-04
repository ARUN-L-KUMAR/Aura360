"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { DashboardSidebar } from "./dashboard-sidebar"
import { Navbar } from "./navbar"
import { FloatingAiWidget } from "@/components/ai/floating-ai-widget"
import { GlobalAiSearchDialog } from "@/components/search/global-ai-search-dialog"

export function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const pathname = usePathname()
  const isChatPage = pathname?.startsWith("/dashboard/chat")

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
        {!isChatPage && <FloatingAiWidget />}
        <GlobalAiSearchDialog />
      </div>
    </div>
  )
}
