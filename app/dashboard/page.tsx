import { getAuthSession } from "@/lib/auth-helpers"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StickyNote, DollarSign, Dumbbell, UtensilsCrossed, Bookmark, Shirt, Sparkles, Clock, User, Settings, Plus, TrendingUp, Calendar, Home, ChevronRight, Activity } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { db, transactions, notes } from "@/lib/db"
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
  const profile = null

  const modules = [
    {
      title: "Notes",
      icon: StickyNote,
      description: "Quick thoughts & ideas",
      href: "/dashboard/notes",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/50",
    },
    {
      title: "Finance",
      icon: DollarSign,
      description: "Track income & expenses",
      href: "/dashboard/finance",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
    },
    {
      title: "Fitness",
      icon: Dumbbell,
      description: "Workouts & measurements",
      href: "/dashboard/fitness",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
    },
    {
      title: "Food",
      icon: UtensilsCrossed,
      description: "Meal tracking & nutrition",
      href: "/dashboard/food",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/50",
    },
    {
      title: "Saved Items",
      icon: Bookmark,
      description: "Articles, videos & more",
      href: "/dashboard/saved",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/50",
    },
    {
      title: "Fashion",
      icon: Shirt,
      description: "Wardrobe management",
      href: "/dashboard/fashion",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
    },
    {
      title: "Skincare",
      icon: Sparkles,
      description: "Routine & products",
      href: "/dashboard/skincare",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/50",
    },
    {
      title: "Time Logs",
      icon: Clock,
      description: "Activity tracking",
      href: "/dashboard/time",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/50",
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      {/* Dashboard Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent hidden sm:inline">
                Aura360
              </span>
            </Link>

            {/* Center Navigation - Desktop */}
            <nav className="hidden md:flex items-center gap-1">
              <Link 
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Home className="w-4 h-4" />
                Home
              </Link>
              <Link 
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-muted text-foreground"
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
                className="p-2 rounded-lg hover:bg-muted transition-colors hidden sm:flex"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-muted-foreground" />
              </Link>

              {/* Profile Avatar */}
              <Link href="/dashboard/profile" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 dark:from-teal-900 dark:to-blue-900 flex items-center justify-center ring-2 ring-transparent group-hover:ring-teal-500 transition-all overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name || "Profile"} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {getInitials()}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium hidden lg:inline">
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

      <div className="mx-auto max-w-7xl p-4 sm:p-6 md:p-10 pb-24 md:pb-10">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8">
          <p className="text-sm text-muted-foreground mb-1">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-1">
            {profile?.full_name ? `${profile.full_name.split(" ")[0]}` : "Welcome back"}!
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">Here's what's happening with your life today</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-xs sm:text-sm">Notes</p>
                  <p className="text-2xl sm:text-3xl font-bold">{notesCount || 0}</p>
                </div>
                <StickyNote className="w-8 h-8 sm:w-10 sm:h-10 text-teal-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-xs sm:text-sm">Transactions</p>
                  <p className="text-2xl sm:text-3xl font-bold">{transactionsCount || 0}</p>
                </div>
                <DollarSign className="w-8 h-8 sm:w-10 sm:h-10 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-xs sm:text-sm">This Month</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {new Date().toLocaleDateString("en-US", { month: "short" })}
                  </p>
                </div>
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-xs sm:text-sm">Modules</p>
                  <p className="text-2xl sm:text-3xl font-bold">8</p>
                </div>
                <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
          <Link href="/dashboard/notes">
            <Button size="sm" className="gap-2 bg-teal-600 hover:bg-teal-700 h-9 sm:h-10">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
              <span className="sm:hidden">Note</span>
            </Button>
          </Link>
          <Link href="/dashboard/finance">
            <Button size="sm" variant="outline" className="gap-2 h-9 sm:h-10">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Transaction</span>
            </Button>
          </Link>
          <Link href="/dashboard/fitness">
            <Button size="sm" variant="outline" className="gap-2 h-9 sm:h-10">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Log Workout</span>
              <span className="sm:hidden">Workout</span>
            </Button>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Module Cards Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold">Your Modules</h2>
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {modules.map((module) => {
                const Icon = module.icon
                return (
                  <Link key={module.title} href={module.href} className="group transition-all hover:scale-[1.02]">
                    <Card className="h-full backdrop-blur-sm bg-card/80 border hover:border-teal-300 dark:hover:border-teal-700 transition-all hover:shadow-md">
                      <CardContent className="p-3 sm:p-4">
                        <div className={`w-10 h-10 rounded-xl ${module.bgColor} flex items-center justify-center mb-2 sm:mb-3`}>
                          <Icon className={`w-5 h-5 ${module.color}`} />
                        </div>
                        <h3 className="font-semibold text-sm sm:text-base">{module.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 hidden sm:block">{module.description}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="lg:col-span-1">
            <Card className="backdrop-blur-sm bg-card/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center justify-between">
                  Recent Activity
                  <Link href="/dashboard/finance" className="text-xs text-muted-foreground hover:text-foreground">
                    View all
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentTransactions && recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === "income" 
                            ? "bg-green-100 dark:bg-green-900/50" 
                            : transaction.type === "expense"
                            ? "bg-red-100 dark:bg-red-900/50"
                            : "bg-purple-100 dark:bg-purple-900/50"
                        }`}>
                          <DollarSign className={`w-4 h-4 ${
                            transaction.type === "income" 
                              ? "text-green-600" 
                              : transaction.type === "expense"
                              ? "text-red-600"
                              : "text-purple-600"
                          }`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${
                        transaction.type === "income" 
                          ? "text-green-600" 
                          : transaction.type === "expense"
                          ? "text-red-600"
                          : "text-purple-600"
                      }`}>
                        {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                    <Link href="/dashboard/finance" className="text-xs text-teal-600 hover:underline">
                      Add your first transaction
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="backdrop-blur-sm bg-card/80 mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link 
                  href="/dashboard/profile"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-teal-600" />
                    <span className="text-sm">Edit Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link 
                  href="/dashboard/settings"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link 
                  href="/"
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Home className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Go to Homepage</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
