"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Plus, 
  DollarSign, 
  Dumbbell, 
  UtensilsCrossed, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  ArrowUpRight,
  Target,
  Zap,
  LayoutGrid,
  StickyNote,
  Bookmark,
  Shirt,
  Sparkles,
  Clock
} from "lucide-react"
import Link from "next/link"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { cn } from "@/lib/utils"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"

interface DashboardClientProps {
  user: any
  profile: any
  totalActivities: number
  recentTransactions: any[]
  chartData: any[]
  counts: {
    notes: number
    finance: number
    fitness: number
    food: number
    saved: number
    fashion: number
    skincare: number
    time: number
  }
}

export function DashboardClient({
  user,
  profile,
  totalActivities,
  recentTransactions,
  chartData,
  counts
}: DashboardClientProps) {
  
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const modules = [
    {
      title: "Notes",
      icon: StickyNote,
      description: "Quick thoughts & ideas",
      href: "/dashboard/notes",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-100 dark:bg-teal-900/50",
      count: counts.notes,
    },
    {
      title: "Finance",
      icon: DollarSign,
      description: "Track income & expenses",
      href: "/dashboard/finance",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/50",
      count: counts.finance,
    },
    {
      title: "Fitness",
      icon: Dumbbell,
      description: "Workouts & measurements",
      href: "/dashboard/fitness",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-100 dark:bg-purple-900/50",
      count: counts.fitness,
    },
    {
      title: "Food",
      icon: UtensilsCrossed,
      description: "Meal tracking & nutrition",
      href: "/dashboard/food",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-100 dark:bg-orange-900/50",
      count: counts.food,
    },
    {
      title: "Saved Items",
      icon: Bookmark,
      description: "Articles, videos & more",
      href: "/dashboard/saved",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-100 dark:bg-pink-900/50",
      count: counts.saved,
    },
    {
      title: "Fashion",
      icon: Shirt,
      description: "Wardrobe management",
      href: "/dashboard/fashion",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-100 dark:bg-indigo-900/50",
      count: counts.fashion,
    },
    {
      title: "Skincare",
      icon: Sparkles,
      description: "Routine & products",
      href: "/dashboard/skincare",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-100 dark:bg-rose-900/50",
      count: counts.skincare,
    },
    {
      title: "Time Logs",
      icon: Clock,
      description: "Activity tracking",
      href: "/dashboard/time",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-100 dark:bg-cyan-900/50",
      count: counts.time,
    },
  ]

  const stats = [
    { 
      label: "Total Activities", 
      val: totalActivities, 
      icon: Activity, 
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      trend: "+12%",
      trendUp: true
    },
    { 
      label: "Finance Logs", 
      val: counts.finance, 
      icon: DollarSign, 
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      trend: "+5%",
      trendUp: true
    },
    { 
      label: "Fitness Sessions", 
      val: counts.fitness, 
      icon: Dumbbell, 
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      trend: "-2%",
      trendUp: false
    },
    { 
      label: "Meals Tracked", 
      val: counts.food, 
      icon: UtensilsCrossed, 
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      trend: "+8%",
      trendUp: true
    }
  ]

  return (
    <div className="mx-auto max-w-7xl p-6 sm:p-10 pb-24 md:pb-10 space-y-10">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-md">
              <Zap className="h-3 w-3 text-yellow-400 fill-yellow-400" />
              {getGreeting()}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Welcome back,<br />
              <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                {profile?.full_name ? profile.full_name.split(" ")[0] : "there"}
              </span>
            </h1>
            <p className="max-w-md text-lg text-slate-400 font-medium">
              You've completed {totalActivities} activities this month. Keep up the great momentum!
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/notes">
              <Button size="lg" className="h-14 px-8 gap-2 font-bold rounded-2xl shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" />
                New Note
              </Button>
            </Link>
            <Link href="/dashboard/finance">
              <Button size="lg" variant="outline" className="h-14 px-8 gap-2 font-bold rounded-2xl border-white/20 bg-white/5 backdrop-blur-md hover:bg-white/10 hover:text-white transition-all">
                <DollarSign className="w-5 h-5" />
                Transaction
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="group overflow-hidden border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/50 hover:ring-primary/50 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className={cn("rounded-2xl p-3 transition-colors group-hover:scale-110 duration-300", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div className={cn(
                  "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                  stat.trendUp ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30" : "bg-rose-50 text-rose-600 dark:bg-rose-950/30"
                )}>
                  <TrendingUp className={cn("h-3 w-3", !stat.trendUp && "rotate-180")} />
                  {stat.trend}
                </div>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                <p className="text-3xl font-bold tracking-tight">{stat.val}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Activity Chart & Modules */}
          <div className="lg:col-span-2 space-y-8">
            <PWAInstallPrompt />

            {/* Chart Section */}
          <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-8">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Activity Overview</CardTitle>
                <CardDescription>Daily activity count for the last 7 days</CardDescription>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-secondary/50 p-1">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-background shadow-sm">Weekly</Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Monthly</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 600, fill: 'hsl(var(--muted-foreground))' }}
                      dy={10}
                    />
                    <YAxis 
                      hide
                    />
                    <Tooltip 
                      cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-xl border bg-background/95 p-3 shadow-xl backdrop-blur-md">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{payload[0].payload.name}</p>
                              <p className="text-sm font-bold">{payload[0].value} activities</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Bar 
                      dataKey="activities" 
                      radius={[6, 6, 0, 0]} 
                      barSize={40}
                    >
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === chartData.length - 1 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.3)"} 
                          className="transition-all duration-300 hover:opacity-80"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Modules Grid */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold">Your Modules</h2>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest bg-primary/10 text-primary px-3 py-1 rounded-full ring-1 ring-primary/20">
                {modules.filter(m => m.count > 0).length} ACTIVE
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => {
                const Icon = module.icon
                const isActive = module.count > 0
                return (
                  <Link key={module.title} href={module.href} className="group relative">
                    {/* Background Glow Effect */}
                    <div className={cn(
                      "absolute -inset-0.5 rounded-[2rem] opacity-0 blur-xl transition-all duration-500 group-hover:opacity-20",
                      module.bgColor.replace('bg-', 'bg-').replace('/50', '')
                    )} />
                    
                    <Card className="relative h-full overflow-hidden border-none bg-background/40 backdrop-blur-md ring-1 ring-border/50 transition-all duration-500 rounded-[2rem] group-hover:ring-primary/20 group-hover:translate-y-[-4px] group-hover:shadow-2xl group-hover:shadow-primary/5">
                      {/* Decorative Background Icon */}
                      <div className="absolute -right-6 -bottom-6 opacity-[0.03] transition-all duration-500 group-hover:scale-125 group-hover:opacity-[0.07] rotate-12">
                        <Icon className="h-32 w-32" />
                      </div>

                      <CardContent className="p-8">
                        <div className="flex items-start justify-between mb-10">
                          <div className={cn(
                            "rounded-2xl p-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
                            module.bgColor,
                            "ring-1 ring-white/10"
                          )}>
                            <Icon className={cn("h-7 w-7", module.color)} />
                          </div>
                          {isActive && (
                            <div className="flex flex-col items-end gap-1">
                              <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/20 ring-2 ring-background">
                                {module.count}
                              </div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">entries</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors flex items-center gap-2">
                            {module.title}
                            <div className="h-1 w-1 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100" />
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed font-medium line-clamp-2 pr-4">
                            {module.description}
                          </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                          <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-primary/0 group-hover:text-primary transition-all translate-x-[-10px] group-hover:translate-x-0 duration-500">
                            GO TO MODULE
                          </div>
                          <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center transition-all duration-500 group-hover:bg-primary group-hover:text-primary-foreground">
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar: Activity & Shortcuts */}
        <div className="space-y-8">
          {/* Recent Activity */}
          <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/50">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent Activity</CardTitle>
                <Link href="/dashboard/finance">
                  <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentTransactions && recentTransactions.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {recentTransactions.map((transaction: any) => (
                    <div key={transaction.id} className="p-4 flex items-center justify-between group hover:bg-secondary/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          "w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border transition-all group-hover:scale-110",
                          transaction.type === "income" 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/50" 
                            : "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50"
                        )}>
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate mb-0.5">{transaction.category}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {new Date(transaction.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right ml-2 shrink-0">
                        <p className={cn(
                          "text-xs font-bold mb-0.5",
                          transaction.type === "income" ? "text-emerald-600" : "text-rose-600"
                        )}>
                          {transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter opacity-60">{transaction.type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto ring-1 ring-border/50">
                    <Activity className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-muted-foreground">No recent activity</p>
                    <p className="text-[10px] text-muted-foreground/60">Your latest logs will appear here</p>
                  </div>
                  <Link href="/dashboard/finance">
                    <Button size="sm" variant="outline" className="text-[10px] font-bold uppercase tracking-widest border-border hover:bg-secondary transition-all">
                      Add entry
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border/50 overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="p-2 space-y-1">
              {[
                { label: "Daily Targets", href: "/dashboard/fitness", icon: Target, color: "text-purple-600", bgColor: "bg-purple-50" },
                { label: "Health Insights", href: "/dashboard/food", icon: TrendingUp, color: "text-blue-600", bgColor: "bg-blue-50" },
                { label: "Smart Search", href: "/dashboard", icon: LayoutGrid, color: "text-emerald-600", bgColor: "bg-emerald-50" }
              ].map((link) => (
                <Link 
                  key={link.label}
                  href={link.href}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg transition-all group-hover:scale-110", link.bgColor)}>
                      <link.icon className={cn("w-4 h-4", link.color)} />
                    </div>
                    <span className="text-xs font-bold">{link.label}</span>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
