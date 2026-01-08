import { getAuthSession } from "@/lib/auth-helpers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StickyNote, DollarSign, Dumbbell, UtensilsCrossed, Bookmark, Shirt, Sparkles, Clock, User, Settings, Plus, TrendingUp, Calendar, Home, ChevronRight, Activity, ArrowUpRight, Zap, Target, BarChart3 } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { db, transactions, notes, fitness, food, fashionItems, savedItems, skincare, timeLogs, users } from "@/lib/db"
import { eq, and, count, desc } from "drizzle-orm"

export default async function DashboardPage() {
  const session = await getAuthSession()
  const user = session.user

  // Fetch actual stats from database
  const workspaceId = user.workspaceId
  const userId = user.id

  // Count transactions
  const [transactionStats] = await db
    .select({ count: count() })
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.userId, userId)
      )
    )

  // Count notes
  const [noteStats] = await db
    .select({ count: count() })
    .from(notes)
    .where(
      and(
        eq(notes.workspaceId, workspaceId),
        eq(notes.userId, userId)
      )
    )

  // Count fitness logs
  const [fitnessStats] = await db
    .select({ count: count() })
    .from(fitness)
    .where(
      and(
        eq(fitness.workspaceId, workspaceId),
        eq(fitness.userId, userId)
      )
    )

  // Count food logs
  const [foodStats] = await db
    .select({ count: count() })
    .from(food)
    .where(
      and(
        eq(food.workspaceId, workspaceId),
        eq(food.userId, userId)
      )
    )

  // Count fashion items
  const [fashionStats] = await db
    .select({ count: count() })
    .from(fashionItems)
    .where(
      and(
        eq(fashionItems.workspaceId, workspaceId),
        eq(fashionItems.userId, userId)
      )
    )

  // Count saved items
  const [savedStats] = await db
    .select({ count: count() })
    .from(savedItems)
    .where(
      and(
        eq(savedItems.workspaceId, workspaceId),
        eq(savedItems.userId, userId)
      )
    )

  // Count skincare items
  const [skincareStats] = await db
    .select({ count: count() })
    .from(skincare)
    .where(
      and(
        eq(skincare.workspaceId, workspaceId),
        eq(skincare.userId, userId)
      )
    )

  // Count time logs
  const [timeStats] = await db
    .select({ count: count() })
    .from(timeLogs)
    .where(
      and(
        eq(timeLogs.workspaceId, workspaceId),
        eq(timeLogs.userId, userId)
      )
    )

  // Fetch recent transactions
  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.workspaceId, workspaceId),
        eq(transactions.userId, userId)
      )
    )
    .orderBy(desc(transactions.createdAt))
    .limit(5)

  const transactionsCount = transactionStats?.count || 0
  const notesCount = noteStats?.count || 0
  const fitnessCount = fitnessStats?.count || 0
  const foodCount = foodStats?.count || 0
  const fashionCount = fashionStats?.count || 0
  const savedCount = savedStats?.count || 0
  const skincareCount = skincareStats?.count || 0
  const timeLogsCount = timeStats?.count || 0
  
  // Calculate total activities
  const totalActivities = transactionsCount + notesCount + fitnessCount + foodCount + 
                          fashionCount + savedCount + skincareCount + timeLogsCount

  // Get user profile
  const [profile] = await db
    .select({
      full_name: users.name,
      avatar_url: users.image,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const modules = [
    {
      title: "Notes",
      icon: StickyNote,
      description: "Quick thoughts & ideas",
      href: "/dashboard/notes",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/50",
      count: notesCount,
    },
    {
      title: "Finance",
      icon: DollarSign,
      description: "Track income & expenses",
      href: "/dashboard/finance",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
      count: transactionsCount,
    },
    {
      title: "Fitness",
      icon: Dumbbell,
      description: "Workouts & measurements",
      href: "/dashboard/fitness",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
      count: fitnessCount,
    },
    {
      title: "Food",
      icon: UtensilsCrossed,
      description: "Meal tracking & nutrition",
      href: "/dashboard/food",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/50",
      count: foodCount,
    },
    {
      title: "Saved Items",
      icon: Bookmark,
      description: "Articles, videos & more",
      href: "/dashboard/saved",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/50",
      count: savedCount,
    },
    {
      title: "Fashion",
      icon: Shirt,
      description: "Wardrobe management",
      href: "/dashboard/fashion",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
      count: fashionCount,
    },
    {
      title: "Skincare",
      icon: Sparkles,
      description: "Routine & products",
      href: "/dashboard/skincare",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/50",
      count: skincareCount,
    },
    {
      title: "Time Logs",
      icon: Clock,
      description: "Activity tracking",
      href: "/dashboard/time",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/50",
      count: timeLogsCount,
    },
  ]

  // Get user initials
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    }
    return user.email?.charAt(0).toUpperCase() || "U"
  }

  // Get current time greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/20">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }} />
      </div>

      {/* Dashboard Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 via-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:inline">
                Aura360
              </span>
            </Link>

            {/* Center Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Link 
                href="/"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-background transition-all"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-background text-foreground shadow-sm font-medium"
              >
                <Activity className="w-4 h-4" />
                Dashboard
              </Link>
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              
              <Link 
                href="/dashboard/settings" 
                className="p-2 rounded-lg hover:bg-muted/80 transition-all hover:scale-105 hidden sm:flex"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              </Link>

              {/* Profile Avatar */}
              <Link href="/dashboard/profile" className="flex items-center gap-2 group">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 p-[2px] ring-2 ring-transparent group-hover:ring-teal-500/50 transition-all">
                    <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                      {profile?.avatar_url ? (
                        <img 
                          src={profile.avatar_url} 
                          alt={profile.full_name || "Profile"} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold bg-gradient-to-br from-teal-600 to-blue-600 bg-clip-text text-transparent">
                          {getInitials()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                </div>
                <span className="text-sm font-medium hidden lg:inline group-hover:text-teal-600 transition-colors">
                  {profile?.full_name || user.email?.split("@")[0]}
                </span>
              </Link>
            </div>
          </div>
        </div>
      </header>

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
            className="flex flex-col items-center gap-1 px-4 py-2 text-teal-600 dark:text-teal-400"
          >
            <Activity className="w-5 h-5" />
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          <Link 
            href="/dashboard/profile"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <User className="w-5 h-5" />
            <span className="text-xs">Profile</span>
          </Link>
          <Link 
            href="/dashboard/settings"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10 relative z-10">
        {/* Welcome Section with Enhanced Design */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500/10 to-blue-500/10 border border-teal-500/20">
              <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span className="text-xs font-medium text-teal-700 dark:text-teal-300">{getGreeting()}</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 dark:from-white dark:via-blue-100 dark:to-purple-100 bg-clip-text text-transparent">
              Welcome back, {profile?.full_name ? `${profile.full_name.split(" ")[0]}` : "there"}!
            </span>
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg flex items-center gap-2">
            <Zap className="w-4 h-4 text-teal-500" />
            Here's your life at a glance
          </p>
        </div>

        {/* Enhanced Stats Overview with Animations */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-10">
          <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-teal-500 via-teal-600 to-emerald-600">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-5 h-5 text-teal-200" />
              </div>
              <div>
                <p className="text-teal-100 text-xs sm:text-sm font-medium mb-1">Total Activities</p>
                <p className="text-3xl sm:text-4xl font-bold text-white">{totalActivities}</p>
                <p className="text-xs text-teal-200 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-teal-200" />
                  All modules combined
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <BarChart3 className="w-5 h-5 text-blue-200" />
              </div>
              <div>
                <p className="text-blue-100 text-xs sm:text-sm font-medium mb-1">Transactions</p>
                <p className="text-3xl sm:text-4xl font-bold text-white">{transactionsCount}</p>
                <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-blue-200" />
                  Finance tracking
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <Dumbbell className="w-6 h-6 text-white" />
                </div>
                <Target className="w-5 h-5 text-purple-200" />
              </div>
              <div>
                <p className="text-purple-100 text-xs sm:text-sm font-medium mb-1">Fitness Logs</p>
                <p className="text-3xl sm:text-4xl font-bold text-white">{fitnessCount}</p>
                <p className="text-xs text-purple-200 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-purple-200" />
                  Workout sessions
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group hover:scale-105 transition-all duration-300 border-0 shadow-xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="p-5 sm:p-6 relative">
              <div className="flex items-start justify-between mb-3">
                <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
                  <UtensilsCrossed className="w-6 h-6 text-white" />
                </div>
                <Calendar className="w-5 h-5 text-orange-200" />
              </div>
              <div>
                <p className="text-orange-100 text-xs sm:text-sm font-medium mb-1">Food Logs</p>
                <p className="text-3xl sm:text-4xl font-bold text-white">{foodCount}</p>
                <p className="text-xs text-orange-200 mt-2 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-orange-200" />
                  Meals tracked
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Bar with Enhanced Design */}
        <div className="mb-8 sm:mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Zap className="w-6 h-6 text-teal-500" />
              Quick Actions
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link href="/dashboard/notes" className="group">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all hover:scale-105 h-12">
                <Plus className="w-5 h-5" />
                <span>New Note</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard/finance" className="group">
              <Button size="lg" variant="outline" className="gap-2 h-12 border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all hover:scale-105 shadow-md">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <span>Add Transaction</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard/fitness" className="group">
              <Button size="lg" variant="outline" className="gap-2 h-12 border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-all hover:scale-105 shadow-md">
                <Dumbbell className="w-5 h-5 text-purple-600" />
                <span>Log Workout</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
            <Link href="/dashboard/food" className="group">
              <Button size="lg" variant="outline" className="gap-2 h-12 border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all hover:scale-105 shadow-md">
                <UtensilsCrossed className="w-5 h-5 text-orange-600" />
                <span className="hidden sm:inline">Add Meal</span>
                <span className="sm:hidden">Meal</span>
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Module Cards Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Target className="w-6 h-6 text-teal-500" />
                Your Modules
              </h2>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {modules.filter(m => m.count > 0).length} active
              </span>
            </div>
            <div className="grid gap-4 sm:gap-5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon
                const isActive = module.count > 0
                return (
                  <Link key={module.title} href={module.href} className="group">
                    <Card className={`h-full relative overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                      isActive 
                        ? 'bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-teal-500/50' 
                        : 'bg-card/50 border-border/30 hover:border-border'
                    }`}>
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 via-blue-500/0 to-purple-500/0 group-hover:from-teal-500/5 group-hover:via-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />
                      
                      <CardContent className="p-5 sm:p-6 relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-14 h-14 rounded-2xl ${module.bgColor} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className={`w-7 h-7 ${module.color}`} />
                          </div>
                          {module.count > 0 && (
                            <div className="relative">
                              <span className="absolute inset-0 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full blur-md opacity-50" />
                              <span className="relative flex items-center justify-center text-xs font-bold bg-gradient-to-r from-teal-500 to-blue-500 text-white px-2.5 py-1 rounded-full shadow-lg">
                                {module.count}
                              </span>
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-base sm:text-lg mb-1 group-hover:text-teal-600 transition-colors">
                            {module.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                            {module.description}
                          </p>
                        </div>
                        
                        {/* Arrow indicator */}
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                          <ArrowUpRight className="w-5 h-5 text-teal-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity Sidebar - Enhanced Design */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-2 border-border/50 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500/10 via-blue-500/10 to-purple-500/10 border-b border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-teal-600" />
                      Recent Activity
                    </span>
                    <Link href="/dashboard/finance" className="text-xs text-teal-600 hover:text-teal-700 font-medium hover:underline">
                      View all →
                    </Link>
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="p-4 space-y-3">
                {recentTransactions && recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="group relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all duration-300 border border-border/50 hover:border-teal-500/30 hover:shadow-md">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                            transaction.type === "income" 
                              ? "bg-gradient-to-br from-green-400 to-emerald-500" 
                              : transaction.type === "expense"
                              ? "bg-gradient-to-br from-red-400 to-rose-500"
                              : "bg-gradient-to-br from-purple-400 to-indigo-500"
                          }`}>
                            <DollarSign className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{transaction.category}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(transaction.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${
                            transaction.type === "income" 
                              ? "text-green-600 dark:text-green-400" 
                              : transaction.type === "expense"
                              ? "text-red-600 dark:text-red-400"
                              : "text-purple-600 dark:text-purple-400"
                          }`}>
                            {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{transaction.type}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 flex items-center justify-center">
                      <DollarSign className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-medium mb-1">No recent activity</p>
                    <p className="text-xs text-muted-foreground mb-4">Start tracking your finances</p>
                    <Link href="/dashboard/finance">
                      <Button size="sm" className="gap-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700">
                        <Plus className="w-4 h-4" />
                        Add Transaction
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links - Enhanced */}
            <Card className="border-2 border-border/50 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border-b border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    Quick Links
                  </CardTitle>
                </CardHeader>
              </div>
              <CardContent className="p-3 space-y-2">
                <Link 
                  href="/dashboard/profile"
                  className="group flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-teal-50 hover:to-blue-50 dark:hover:from-teal-950/30 dark:hover:to-blue-950/30 transition-all border border-transparent hover:border-teal-200 dark:hover:border-teal-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/10 to-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User className="w-5 h-5 text-teal-600" />
                    </div>
                    <span className="text-sm font-medium">Edit Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link 
                  href="/dashboard/settings"
                  className="group flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950/30 dark:hover:to-indigo-950/30 transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Settings className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </Link>
                <Link 
                  href="/"
                  className="group flex items-center justify-between p-4 rounded-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/30 dark:hover:to-pink-950/30 transition-all border border-transparent hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Home className="w-5 h-5 text-purple-600" />
                    </div>
                    <span className="text-sm font-medium">Homepage</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
