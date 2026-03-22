"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  StickyNote, 
  DollarSign, 
  Dumbbell, 
  UtensilsCrossed, 
  Bookmark, 
  Shirt, 
  Sparkles, 
  Clock, 
  LayoutDashboard,
  User,
  Settings,
  LogOut,
  Search,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSession, signOut } from "next-auth/react"
import { Logo } from "@/components/ui/logo"
import { useState, useEffect } from "react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

const modules = [
  {
    title: "Dashboard",
    icon: Home,
    href: "/dashboard",
    color: "text-slate-600 dark:text-slate-400",
  },
  {
    title: "Notes",
    icon: StickyNote,
    href: "/dashboard/notes",
    color: "text-teal-600 dark:text-teal-400",
  },
  {
    title: "Finance",
    icon: DollarSign,
    href: "/dashboard/finance",
    color: "text-blue-600 dark:text-blue-400",
  },
  {
    title: "Fitness",
    icon: Dumbbell,
    href: "/dashboard/fitness",
    color: "text-purple-600 dark:text-purple-400",
  },
  {
    title: "Food",
    icon: UtensilsCrossed,
    href: "/dashboard/food",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    title: "Saved Items",
    icon: Bookmark,
    href: "/dashboard/saved",
    color: "text-pink-600 dark:text-pink-400",
  },
  {
    title: "Fashion",
    icon: Shirt,
    href: "/dashboard/fashion",
    color: "text-indigo-600 dark:text-indigo-400",
  },
  {
    title: "Skincare",
    icon: Sparkles,
    href: "/dashboard/skincare",
    color: "text-rose-600 dark:text-rose-400",
  },
  {
    title: "Time Logs",
    icon: Clock,
    href: "/dashboard/time",
    color: "text-cyan-600 dark:text-cyan-400",
  },
]

export function DashboardSidebar({ isCollapsed, setIsCollapsed }: { isCollapsed: boolean, setIsCollapsed: (v: boolean) => void }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      if (mobile) setIsCollapsed(true)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [setIsCollapsed])

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {modules.slice(0, 5).map((module) => {
            const isActive = pathname === module.href
            const Icon = module.icon
            return (
              <Link
                key={module.title}
                href={module.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 transition-all",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate max-w-[60px]">
                  {module.title.split(' ')[0]}
                </span>
              </Link>
            )
          })}
          <Link
            href="/dashboard/profile"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 transition-all",
              pathname === "/dashboard/profile" ? "text-primary" : "text-muted-foreground"
            )}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Me</span>
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <aside 
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-background/80 backdrop-blur-xl border-r transition-all duration-300 flex flex-col group",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header / Logo */}
      <div className="h-20 flex items-center px-4 mb-4">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0">
            <Logo />
          </div>
          <span className={cn(
            "font-bold text-lg tracking-tight transition-opacity duration-300 whitespace-nowrap bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            Aura360
          </span>
        </Link>
      </div>

      {/* Collapse Toggle (Desktop) */}
      {!isMobile && (
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-background border rounded-full p-1 hover:text-primary transition-colors shadow-sm"
        >
          {isCollapsed ? <PanelLeftOpen className="w-3 h-3" /> : <PanelLeftClose className="w-3 h-3" />}
        </button>
      )}

      {/* Main Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar px-3 space-y-1">
        <div className={cn(
          "px-3 mb-2 transition-opacity duration-300",
          isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100"
        )}>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
            Modules
          </span>
        </div>
        
        {modules.map((module) => {
          const isActive = pathname === module.href
          const Icon = module.icon
          return (
            <Link
              key={module.title}
              href={module.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group/item relative",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={isCollapsed ? module.title : ""}
            >
              <Icon className={cn(
                "w-5 h-5 shrink-0 transition-colors",
                isActive ? "text-primary" : "group-hover/item:text-foreground",
                module.color
              )} />
              <span className={cn(
                "text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap",
                isCollapsed ? "opacity-0 w-0" : "opacity-100"
              )}>
                {module.title}
              </span>
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary rounded-r-full" />
              )}
            </Link>
          )
        })}
      </div>

      {/* Footer Nav */}
      <div className="p-3 border-t bg-secondary/20 space-y-1">
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 group/item",
            pathname === "/dashboard/profile" && "bg-secondary text-foreground"
          )}
          title={isCollapsed ? "Profile" : ""}
        >
          <User className="w-5 h-5 shrink-0" />
          <span className={cn(
            "text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            Profile
          </span>
        </Link>

        <Link
          href="/dashboard/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 group/item",
            pathname === "/dashboard/settings" && "bg-secondary text-foreground"
          )}
          title={isCollapsed ? "Settings" : ""}
        >
          <Settings className="w-5 h-5 shrink-0" />
          <span className={cn(
            "text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            Settings
          </span>
        </Link>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group/item"
          title={isCollapsed ? "Sign Out" : ""}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={cn(
            "text-sm font-bold tracking-tight transition-all duration-300 whitespace-nowrap",
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          )}>
            Sign Out
          </span>
        </button>

        <div className={cn(
          "flex items-center justify-center pt-2 transition-all duration-300",
          isCollapsed ? "flex-col gap-2" : "justify-between px-3"
        )}>
           <ThemeToggle />
           {!isCollapsed && (
             <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                v2.0.4
             </span>
           )}
        </div>
      </div>
    </aside>
  )
}
