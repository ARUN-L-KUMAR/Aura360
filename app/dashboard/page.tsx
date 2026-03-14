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
    <div className="">

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16">
          <Link 
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Home</span>
          </Link>
          <Link 
            href="/dashboard"
            className="flex flex-col items-center gap-1 px-4 py-2 text-foreground"
          >
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Dash</span>
          </Link>
          <Link 
            href="/dashboard/profile"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Profile</span>
          </Link>
          <Link 
            href="/dashboard/settings"
            className="flex flex-col items-center gap-1 px-4 py-2 text-muted-foreground"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Set</span>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10">
        {/* Welcome Section */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="px-3 py-1 rounded-full bg-secondary border text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {getGreeting()}
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
            Welcome back, {profile?.full_name ? `${profile.full_name.split(" ")[0]}` : "there"}!
          </h1>
          <p className="text-muted-foreground text-lg font-medium flex items-center gap-2">
            Here's your life at a glance
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Activities", val: totalActivities, icon: Activity, color: "text-slate-600 dark:text-slate-400" },
            { label: "Transactions", val: transactionsCount, icon: DollarSign, color: "text-slate-600 dark:text-slate-400" },
            { label: "Fitness", val: fitnessCount, icon: Dumbbell, color: "text-slate-600 dark:text-slate-400" },
            { label: "Food", val: foodCount, icon: UtensilsCrossed, color: "text-slate-600 dark:text-slate-400" }
          ].map((stat, i) => (
            <Card key={i} className="">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border">
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold tracking-tight">{stat.val}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions Bar */}
        <div className="mb-12">
          <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground mb-6">Quick Actions</h2>
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Link href="/dashboard/notes">
              <Button size="lg" className="h-12 px-6 gap-2 font-bold shadow-none">
                <Plus className="w-5 h-5" />
                New Note
              </Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button size="lg" variant="outline" className="h-12 px-6 gap-2 font-bold border-border shadow-none hover:bg-secondary">
                <DollarSign className="w-5 h-5" />
                Add Transaction
              </Button>
            </Link>
            <Link href="/dashboard/fitness">
              <Button size="lg" variant="outline" className="h-12 px-6 gap-2 font-bold border-border shadow-none hover:bg-secondary">
                <Dumbbell className="w-5 h-5" />
                Log Workout
              </Button>
            </Link>
            <Link href="/dashboard/food">
              <Button size="lg" variant="outline" className="h-12 px-6 gap-2 font-bold border-border shadow-none hover:bg-secondary">
                <UtensilsCrossed className="w-5 h-5" />
                Add Meal
              </Button>
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Module Cards Grid */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Modules</h2>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-secondary border px-3 py-1 rounded-full">
                {modules.filter(m => m.count > 0).length} active
              </span>
            </div>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              {modules.map((module) => {
                const Icon = module.icon
                const isActive = module.count > 0
                return (
                  <Link key={module.title} href={module.href} className="group">
                    <Card className="h-full transition-all group-hover:border-primary/50 group-hover:shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center border transition-colors group-hover:bg-primary/5">
                            <Icon className="w-5 h-5 text-muted-foreground transition-colors group-hover:text-primary" />
                          </div>
                          {isActive && (
                            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded leading-none">
                              {module.count}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm mb-1 tracking-tight">{module.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-snug font-medium line-clamp-2">
                          {module.description}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="lg:col-span-1 space-y-8">
            <Card className="">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-between">
                  Activity
                  <Link href="/dashboard/finance" className="text-[10px] text-primary hover:underline">
                    All
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {recentTransactions && recentTransactions.length > 0 ? (
                  <div className="divide-y divide-border/30">
                    {recentTransactions.map((transaction: any) => (
                      <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center border ${
                            transaction.type === "income" 
                              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" 
                              : transaction.type === "expense"
                              ? "bg-rose-50 text-rose-600 dark:bg-rose-950/30"
                              : "bg-slate-50 text-slate-600 dark:bg-slate-950/30"
                          }`}>
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate leading-none mb-1">{transaction.category}</p>
                            <p className="text-[10px] text-muted-foreground font-medium">
                              {new Date(transaction.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right ml-2 shrink-0">
                          <p className={`text-xs font-bold leading-none mb-1 ${
                            transaction.type === "income" ? "text-emerald-600" : "text-rose-600"
                          }`}>
                            {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">{transaction.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-xs font-bold text-muted-foreground mb-4">No recent activity</p>
                    <Link href="/dashboard/finance">
                      <Button size="sm" variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-border">
                        Add entry
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card className="">
              <CardHeader className="pb-4 border-b">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="p-2 space-y-1">
                {[
                  { label: "Profile", href: "/dashboard/profile", icon: User },
                  { label: "Settings", href: "/dashboard/settings", icon: Settings },
                  { label: "Dashboard", href: "/dashboard", icon: Activity }
                ].map((link) => (
                  <Link 
                    key={link.label}
                    href={link.href}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold">{link.label}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
