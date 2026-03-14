"use client"
import { useState, useEffect } from "react"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, Home, Activity, Settings, User, Bell, Search, LayoutGrid, ChevronRight, DollarSign, StickyNote, Shirt } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useSession } from "next-auth/react"

interface NavbarProps {}

export function Navbar({}: NavbarProps) {
  const { data: session } = useSession()
  const user = session?.user
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: Activity },
    { name: "Finance", href: "/dashboard/finance", icon: DollarSign },
    { name: "Notes", href: "/dashboard/notes", icon: StickyNote },
    { name: "Fashion", href: "/dashboard/fashion", icon: Shirt },
  ]

  const isModulePage = pathname?.startsWith("/dashboard/") && pathname !== "/dashboard"

  return (
    <nav 
      className={cn(
        "fixed top-4 left-0 right-0 z-50 transition-all duration-300 px-4",
        isScrolled ? "top-2" : "top-4"
      )}
    >
      <div className={cn(
        "mx-auto max-w-5xl h-16 rounded-2xl border transition-all duration-300 flex items-center justify-between px-4 sm:px-6 shadow-2xl",
        isScrolled 
          ? "bg-background/80 backdrop-blur-xl border-border shadow-primary/5" 
          : "bg-background/50 backdrop-blur-md border-border/50"
      )}>
        {/* Left: Logo & Breadcrumbs */}
        <div className="flex items-center gap-4 text-slate-100">
          <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 rotate-0 group-hover:rotate-12 transition-transform duration-300">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight hidden lg:block bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Aura360
            </span>
          </Link>

          {isModulePage && (
             <div className="hidden sm:flex items-center gap-2 ml-2 py-1 px-3 rounded-full bg-secondary/50 border border-border/40">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                   Dashboard
                </span>
                <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                   {pathname.split("/").pop()}
                </span>
             </div>
          )}
        </div>

        {/* Center: Navigation */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-secondary/30 border border-border/20">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                  isActive
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/30"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                {item.name}
              </Link>
            )
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 mr-2 px-1 py-1 rounded-lg bg-secondary/20 border border-border/10">
             <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background transition-colors">
                <Search className="w-4 h-4 text-muted-foreground" />
             </Button>
             <Link href="/dashboard/settings">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-background transition-colors">
                   <Settings className="w-4 h-4 text-muted-foreground" />
                </Button>
             </Link>
          </div>

          <ThemeToggle />

          <Link href="/dashboard/profile">
            <div className="w-9 h-9 rounded-xl bg-secondary border border-border/50 p-0.5 group overflow-hidden transition-all hover:border-primary/50 shadow-sm">
              <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center overflow-hidden">
                {user?.image ? (
                  <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </Link>
        </div>
      </div>
    </nav>
  )
}
