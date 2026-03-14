"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useSession, signOut } from "next-auth/react"
import { 
  Sparkles, 
  DollarSign, 
  Dumbbell, 
  UtensilsCrossed, 
  Shirt, 
  StickyNote,
  Clock,
  Bookmark,
  ChevronRight,
  ArrowRight,
  Check,
  Zap,
  Shield,
  Smartphone,
  Menu,
  X,
  User,
  Activity,
  LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"

const features = [
  {
    icon: DollarSign,
    title: "Finance Tracker",
    description: "Track income, expenses & investments. Import from Excel/CSV. Smart categorization.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: Dumbbell,
    title: "Fitness Log",
    description: "Log workouts, track body measurements, monitor progress over time.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: UtensilsCrossed,
    title: "Food Diary",
    description: "Track meals, calories, and nutrition. Build healthy eating habits.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: Shirt,
    title: "Fashion Wardrobe",
    description: "Organize your closet, plan outfits, track fashion wishlist.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: Sparkles,
    title: "Skincare Routine",
    description: "Track skincare products, routines, and skin health progress.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: StickyNote,
    title: "Quick Notes",
    description: "Capture thoughts, ideas, and important information instantly.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Track how you spend your time. Boost productivity.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    icon: Bookmark,
    title: "Saved Items",
    description: "Save articles, videos, and links for later reference.",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-900/50",
  },
]

const benefits = [
  {
    icon: Zap,
    title: "All-in-One Platform",
    description: "Everything you need to manage your life in one beautiful dashboard.",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your data is encrypted and stored securely. We never share your information.",
  },
  {
    icon: Smartphone,
    title: "Mobile Friendly",
    description: "Access your dashboard anywhere. Fully responsive on all devices.",
  },
]

import { useRouter, redirect } from "next/navigation"

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Check if user is logged in with NextAuth
  const { data: session, status } = useSession()
  const user = session?.user
  
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "authenticated") {
    return null // Don't render anything while redirecting
  }
  const isLoading = status === "loading"

  // Get user initials
  const getInitials = () => {
    if (user?.name) {
      return user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return user?.email?.charAt(0).toUpperCase() || "U"
  }

  // Handle sign out
  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-background/80 backdrop-blur-lg border-b shadow-sm" 
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Aura360
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Benefits
              </Link>
              <ThemeToggle />
              
              {isLoading ? (
                <div className="w-20 h-9 bg-muted rounded-lg animate-pulse" />
              ) : user ? (
                // Logged in user menu
                <div className="flex items-center gap-3">
                  <Link href="/dashboard">
                    <Button size="sm" variant="outline" className="gap-2">
                      <Activity className="w-4 h-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Link href="/dashboard/profile" className="flex items-center gap-2 group">
                    <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center ring-1 ring-border group-hover:ring-primary transition-all overflow-hidden">
                      {user?.image ? (
                        <img 
                          src={user.image} 
                          alt={user.name || "Profile"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-muted-foreground">
                          {getInitials()}
                        </span>
                      )}
                    </div>
                  </Link>
                </div>
              ) : (
                // Not logged in
                <>
                  <Link href="/auth/login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up">
                    <Button size="sm" variant="default">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-lg border-b">
            <div className="px-4 py-4 space-y-3">
              <Link 
                href="#features" 
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#benefits" 
                className="block py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefits
              </Link>
              
              {user ? (
                // Logged in user mobile menu
                <div className="space-y-3 pt-2 border-t">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full gap-2">
                      <Activity className="w-4 h-4" />
                      Go to Dashboard
                    </Button>
                  </Link>
                  <div className="flex gap-2">
                    <Link href="/dashboard/profile" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full gap-2">
                        <User className="w-4 h-4" />
                        Profile
                      </Button>
                    </Link>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        handleSignOut()
                        setMobileMenuOpen(false)
                      }}
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                // Not logged in mobile menu
                <div className="flex gap-2 pt-2 border-t">
                  <Link href="/auth/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs font-semibold mb-8 border border-border">
            <Sparkles className="w-3 h-3" />
            Personal Life Management Hub
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8">
            Manage Your Life
            <br />
            <span className="text-muted-foreground">All in One Place</span>
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Track your finances, fitness, food, fashion, skincare, and more. 
            Aura360 brings everything together in one unified dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            {user ? (
              // Logged in CTA
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/profile">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                    View Profile
                    <User className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            ) : (
              // Not logged in CTA
              <>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                    Start Free Today
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                    Sign In
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>No credit card</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Sync across devices</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 border-t bg-slate-50/50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Eight powerful modules to help you track, manage, and improve every aspect of your life.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={feature.title}
                  className="group transition-all duration-300 border border-border/50 hover:border-primary/50 shadow-none hover:shadow-sm bg-background"
                >
                  <CardContent className="p-8">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center mb-6",
                      feature.bgColor
                    )}>
                      <Icon className={cn("w-5 h-5", feature.color)} />
                    </div>
                    <h3 className="font-bold text-lg mb-3 tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 px-4 sm:px-6 lg:px-8 border-t">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 tracking-tight">Why Choose Aura360?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-medium">
              Built with simplicity and power in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="text-center group">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-6 border border-border group-hover:border-primary/50 transition-colors">
                    <Icon className="w-6 h-6 text-foreground" />
                  </div>
                  <h3 className="font-bold text-xl mb-3 tracking-tight">{benefit.title}</h3>
                  <p className="text-muted-foreground font-medium">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 border-t">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6 tracking-tight">
            {user ? "Ready to Continue?" : "Ready to Transform Your Life?"}
          </h2>
          <p className="text-lg text-slate-400 mb-10 font-medium">
            {user 
              ? "Your dashboard is waiting. Continue managing your life with Aura360."
              : "Join thousands of users who are already managing their lives better with Aura360."
            }
          </p>
          <Link href={user ? "/dashboard" : "/auth/sign-up"}>
            <Button size="lg" variant="secondary" className="h-12 px-8 text-base gap-2 font-bold">
              {user ? "Go to Dashboard" : "Get Started for Free"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 sm:px-6 lg:px-8 border-t bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg tracking-tight">Aura360</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-10 text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="#benefits" className="hover:text-foreground transition-colors">Benefits</Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>

            {/* Copyright */}
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/40">
              © {new Date().getFullYear()} Aura360
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
