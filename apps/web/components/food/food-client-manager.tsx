"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LayoutDashboard,
  Sparkles,
  Calendar,
  History,
  Plus,
  UtensilsCrossed,
} from "lucide-react"
import { FoodOverviewTab } from "./food-overview-tab"
import { FoodQuickLogTab } from "./food-quick-log-tab"
import { FoodPlannerTab } from "./food-planner-tab"
import { MealsList } from "./meals-list"
import { AddMealDialog } from "./add-meal-dialog"
import { Button } from "@/components/ui/button"

interface FoodClientManagerProps {
  initialMeals: any[]
}

export function FoodClientManager({ initialMeals }: FoodClientManagerProps) {
  const [meals, setMeals] = useState<any[]>(initialMeals)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [defaultQuickLogType, setDefaultQuickLogType] = useState<string>("lunch")

  const handleRefresh = async () => {
    try {
      const res = await fetch("/api/food")
      if (res.ok) {
        const fresh = await res.json()
        setMeals(fresh)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleAddMealForType = (mealType: string) => {
    setDefaultQuickLogType(mealType)
    setActiveTab("quick-log")
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <TabsList className="bg-secondary/70 p-1 rounded-xl border flex items-center justify-start overflow-x-auto no-scrollbar h-auto shadow-none w-full sm:w-fit">
            <TabsTrigger
              value="overview"
              className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Macro Rings</span>
            </TabsTrigger>

            <TabsTrigger
              value="quick-log"
              className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>AI Quick-Log</span>
            </TabsTrigger>

            <TabsTrigger
              value="planner"
              className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Meal Planner & Chef</span>
            </TabsTrigger>

            <TabsTrigger
              value="history"
              className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5" />
              <span>Meal History</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="gap-1.5 text-xs font-bold uppercase tracking-wider h-9 px-3"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Log
            </Button>
          </div>
        </div>

        {/* Tab 1: Overview & Macros */}
        <TabsContent value="overview" className="mt-0 outline-none">
          <FoodOverviewTab
            meals={meals}
            onSwitchTab={setActiveTab}
            onAddMealForType={handleAddMealForType}
          />
        </TabsContent>

        {/* Tab 2: AI Quick-Log */}
        <TabsContent value="quick-log" className="mt-0 outline-none">
          <FoodQuickLogTab
            onMealLogged={handleRefresh}
            defaultMealType={defaultQuickLogType}
          />
        </TabsContent>

        {/* Tab 3: Meal Planner & Chef */}
        <TabsContent value="planner" className="mt-0 outline-none">
          <FoodPlannerTab onMealLogged={handleRefresh} />
        </TabsContent>

        {/* Tab 4: History Log */}
        <TabsContent value="history" className="mt-0 outline-none">
          <MealsList initialMeals={meals} />
        </TabsContent>
      </Tabs>

      <AddMealDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
