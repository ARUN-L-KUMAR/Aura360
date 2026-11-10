"use client"

import { useState } from "react"
import { SkincareProduct, BodyPart } from "@/lib/types/skincare"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Scissors, 
  Droplets, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Sun, 
  Moon,
  ChevronRight,
  Search,
  LayoutGrid,
  List,
  Filter,
  Package
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProductsList } from "./products-list"
import { RoutinePlanner } from "./routine-planner"
import { SkincareInsights } from "./skincare-insights"
import { AddProductButton } from "./add-product-button"

interface SelfCareHubProps {
  products: SkincareProduct[]
}

export function SelfCareHub({ products }: SelfCareHubProps) {
  const [activeArea, setActiveArea] = useState<BodyPart | "all">("all")
  const [view, setView] = useState<"routine" | "shelf" | "insights">("shelf")

  const areaCounts = {
    all: products.filter(p => p.status === "owned").length,
    face: products.filter(p => p.bodyPart === "face" && p.status === "owned").length,
    hair: products.filter(p => p.bodyPart === "hair" && p.status === "owned").length,
    body: products.filter(p => p.bodyPart === "body" && p.status === "owned").length,
  }

  const areaProducts = activeArea === "all" 
    ? products 
    : products.filter(p => p.bodyPart === activeArea)

  const areas = [
    { id: "all" as const, label: "All Products", icon: Package, color: "text-rose-600 bg-rose-50 dark:bg-rose-900/20" },
    { id: "face" as const, label: "Face Care", icon: User, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
    { id: "hair" as const, label: "Hair Care", icon: Scissors, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
    { id: "body" as const, label: "Body Care", icon: Droplets, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Area Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {areas.map((area) => {
          const Icon = area.icon
          const isActive = activeArea === area.id
          return (
            <button
              key={area.id}
              onClick={() => setActiveArea(area.id)}
              className={cn(
                "relative flex flex-col items-start p-6 rounded-3xl border-2 transition-all duration-300 text-left group",
                isActive 
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.02]" 
                  : "border-transparent bg-card hover:border-muted-foreground/20 hover:bg-muted/30"
              )}
            >
              <div className={cn("p-3 rounded-2xl mb-4 transition-transform group-hover:scale-110", area.color)}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">{area.label}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {areaCounts[area.id]} products owned
              </p>
              {isActive && (
                <div className="absolute top-4 right-4">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-card/30 backdrop-blur-xl rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 gap-4">
          <div className="flex items-center gap-1 sm:gap-2 bg-muted/50 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto">
            <Button 
              variant={view === "routine" ? "secondary" : "ghost"} 
              onClick={() => setView("routine")}
              className="flex-1 sm:flex-none rounded-lg sm:rounded-xl px-2 sm:px-6 h-9 sm:h-10 font-medium text-xs sm:text-sm"
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Routine
            </Button>
            <Button 
              variant={view === "shelf" ? "secondary" : "ghost"} 
              onClick={() => setView("shelf")}
              className="flex-1 sm:flex-none rounded-lg sm:rounded-xl px-2 sm:px-6 h-9 sm:h-10 font-medium text-xs sm:text-sm"
            >
              <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Shelf
            </Button>
            <Button 
              variant={view === "insights" ? "secondary" : "ghost"} 
              onClick={() => setView("insights")}
              className="flex-1 sm:flex-none rounded-lg sm:rounded-xl px-2 sm:px-6 h-9 sm:h-10 font-medium text-xs sm:text-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Insights
            </Button>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
             <AddProductButton className="w-full sm:w-auto" />
          </div>
        </div>

        <div className="p-4 sm:p-8">
          {view === "routine" && (
            <div className="space-y-6 sm:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold capitalize">
                    {activeArea === "all" ? "Total Routine" : `${activeArea} Routine`}
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">Follow your step-by-step care plan</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs">AM Checklist</Badge>
                  <Badge variant="outline" className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs">PM Checklist</Badge>
                </div>
              </div>
              <RoutinePlanner products={areaProducts} />
            </div>
          )}

          {view === "shelf" && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold capitalize">
                    {activeArea === "all" ? "Complete Shelf" : `${activeArea} Shelf`}
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">Your inventory for this focus area</p>
                </div>
              </div>
              <ProductsList initialProducts={areaProducts} />
            </div>
          )}

          {view === "insights" && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold capitalize">
                    {activeArea === "all" ? "Global Insights" : `${activeArea} Insights`}
                  </h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">Smart tracking and recommendations</p>
                </div>
              </div>
              <SkincareInsights products={areaProducts} />
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-slate-200 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              Morning Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
             <p className="text-xs sm:text-sm text-muted-foreground">You have {products.filter(p => p.routineTime === "morning" || p.routineTime === "both").length} steps in your morning routine across all areas.</p>
          </CardContent>
        </Card>
        <Card className="rounded-[1.5rem] sm:rounded-[2rem] border-slate-200 dark:border-slate-800 bg-purple-50/30 dark:bg-purple-900/10">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
              Evening Highlights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
             <p className="text-xs sm:text-sm text-muted-foreground">You have {products.filter(p => p.routineTime === "evening" || p.routineTime === "both").length} steps in your evening routine across all areas.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
