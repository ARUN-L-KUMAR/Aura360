import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StickyNote, DollarSign, Dumbbell, UtensilsCrossed, Bookmark, Shirt, Sparkles, Clock } from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const modules = [
    {
      title: "Notes",
      icon: StickyNote,
      description: "Quick thoughts & ideas",
      href: "/dashboard/notes",
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-50 dark:bg-teal-950/50",
    },
    {
      title: "Finance",
      icon: DollarSign,
      description: "Track income & expenses",
      href: "/dashboard/finance",
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
    },
    {
      title: "Fitness",
      icon: Dumbbell,
      description: "Workouts & measurements",
      href: "/dashboard/fitness",
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-50 dark:bg-purple-950/50",
    },
    {
      title: "Food",
      icon: UtensilsCrossed,
      description: "Meal tracking & nutrition",
      href: "/dashboard/food",
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50 dark:bg-orange-950/50",
    },
    {
      title: "Saved Items",
      icon: Bookmark,
      description: "Articles, videos & more",
      href: "/dashboard/saved",
      color: "text-pink-600 dark:text-pink-400",
      bgColor: "bg-pink-50 dark:bg-pink-950/50",
    },
    {
      title: "Fashion",
      icon: Shirt,
      description: "Wardrobe management",
      href: "/dashboard/fashion",
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-50 dark:bg-indigo-950/50",
    },
    {
      title: "Skincare",
      icon: Sparkles,
      description: "Routine & products",
      href: "/dashboard/skincare",
      color: "text-rose-600 dark:text-rose-400",
      bgColor: "bg-rose-50 dark:bg-rose-950/50",
    },
    {
      title: "Time Logs",
      icon: Clock,
      description: "Activity tracking",
      href: "/dashboard/time",
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-lavender-50 dark:from-teal-950 dark:via-blue-950 dark:to-purple-950">
      <div className="mx-auto max-w-7xl p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Welcome back!</h1>
          <p className="text-muted-foreground">Your personal dashboard for life management</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => {
            const Icon = module.icon
            return (
              <a key={module.title} href={module.href} className="group transition-transform hover:scale-105">
                <Card className="h-full backdrop-blur-sm bg-card/80 border-2 hover:border-teal-300 dark:hover:border-teal-700 transition-colors">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-lg ${module.bgColor} flex items-center justify-center mb-3`}>
                      <Icon className={`w-6 h-6 ${module.color}`} />
                    </div>
                    <CardTitle className="text-xl">{module.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{module.description}</p>
                  </CardContent>
                </Card>
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
