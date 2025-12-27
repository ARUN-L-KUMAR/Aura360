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
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  {
    icon: Dumbbell,
    title: "Fitness Log",
    description: "Log workouts, track body measurements, monitor progress over time.",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/50",
  },
  {
    icon: UtensilsCrossed,
    title: "Food Diary",
    description: "Track meals, calories, and nutrition. Build healthy eating habits.",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/50",
  },
  {
    icon: Shirt,
    title: "Fashion Wardrobe",
    description: "Organize your closet, plan outfits, track fashion wishlist.",
    color: "text-indigo-600 dark:text-indigo-400",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
  },
  {
    icon: Sparkles,
    title: "Skincare Routine",
    description: "Track skincare products, routines, and skin health progress.",
    color: "text-rose-600 dark:text-rose-400",
    bgColor: "bg-rose-100 dark:bg-rose-900/50",
  },
  {
    icon: StickyNote,
    title: "Quick Notes",
    description: "Capture thoughts, ideas, and important information instantly.",
    color: "text-teal-600 dark:text-teal-400",
    bgColor: "bg-teal-100 dark:bg-teal-900/50",
  },
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Track how you spend your time. Boost productivity.",
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/50",
  },
  {
    icon: Bookmark,
    title: "Saved Items",
    description: "Save articles, videos, and links for later reference.",
    color: "text-pink-600 dark:text-pink-400",
    bgColor: "bg-pink-100 dark:bg-pink-900/50",
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

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-50 dark:from-gray-950 dark:via-slate-950 dark:to-zinc-950">
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
                Aura360
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900 dark:to-blue-900 flex items-center justify-center ring-2 ring-transparent group-hover:ring-teal-500 transition-all overflow-hidden">
                      {user?.image ? (
                        <img 
                          src={user.image} 
                          alt={user.name || "Profile"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
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
                    <Button size="sm" className="bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700">
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
                className="block py-2 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </Link>
              <Link 
                href="#benefits" 
                className="block py-2 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Benefits
              </Link>
              
              {user ? (
                // Logged in user mobile menu
                <div className="space-y-3 pt-2 border-t">
                  <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full gap-2 bg-gradient-to-r from-teal-600 to-blue-600">
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
                <div className="flex gap-2 pt-2">
                  <Link href="/auth/login" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Sign In</Button>
                  </Link>
                  <Link href="/auth/sign-up" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full bg-gradient-to-r from-teal-600 to-blue-600">Get Started</Button>
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 text-sm font-medium mb-8">
            <Sparkles className="w-4 h-4" />
            Your Personal Life Management Hub
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Manage Your Life</span>
            <br />
            <span className="bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              All in One Place
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Track your finances, fitness, food, fashion, skincare, and more. 
            Aura360 brings everything together in one beautiful, unified dashboard.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            {user ? (
              // Logged in CTA
              <>
                <Link href="/dashboard">
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 gap-2">
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
                  <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 gap-2">
                    Start Free Today
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base gap-2">
                    Sign In to Dashboard
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Free to use</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              <span>Sync across devices</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-background/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Eight powerful modules to help you track, manage, and improve every aspect of your life.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card 
                  key={feature.title}
                  className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-2 hover:border-teal-200 dark:hover:border-teal-800"
                >
                  <CardContent className="p-6">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center mb-4",
                      feature.bgColor
                    )}>
                      <Icon className={cn("w-6 h-6", feature.color)} />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
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
      <section id="benefits" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Why Choose Aura360?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with simplicity and power in mind.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {benefits.map((benefit) => {
              const Icon = benefit.icon
              return (
                <div key={benefit.title} className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900/50 dark:to-blue-900/50 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-teal-600 to-blue-600 dark:from-teal-800 dark:to-blue-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {user ? "Ready to Continue?" : "Ready to Transform Your Life?"}
          </h2>
          <p className="text-lg text-teal-100 mb-8">
            {user 
              ? "Your dashboard is waiting. Continue managing your life with Aura360."
              : "Join thousands of users who are already managing their lives better with Aura360."
            }
          </p>
          <Link href={user ? "/dashboard" : "/auth/sign-up"}>
            <Button size="lg" className="h-12 px-8 text-base bg-white text-teal-700 hover:bg-teal-50 gap-2">
              {user ? "Go to Dashboard" : "Get Started for Free"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t bg-background/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">Aura360</span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
              <Link href="#benefits" className="hover:text-foreground transition-colors">Benefits</Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Aura360. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
