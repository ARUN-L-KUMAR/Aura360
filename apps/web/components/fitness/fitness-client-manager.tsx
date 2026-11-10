"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Activity,
  Flame,
  Dumbbell,
  Play,
  TrendingUp,
  History,
  Sparkles,
  LayoutDashboard,
  Timer,
  Plus,
} from "lucide-react"
import { FitnessOverviewTab } from "./fitness-overview-tab"
import { FitnessAiCoachTab } from "./fitness-ai-coach-tab"
import { FitnessLiveSession } from "./fitness-live-session"
import { FitnessAnalyticsTab } from "./fitness-analytics-tab"
import { FitnessLog } from "./fitness-log"
import { AddFitnessDialog } from "./add-fitness-dialog"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface FitnessClientManagerProps {
  initialData: any[]
}

export function FitnessClientManager({ initialData }: FitnessClientManagerProps) {
  const router = useRouter()
  const [data, setData] = useState<any[]>(initialData)
  const [activeTab, setActiveTab] = useState<string>("overview")
  const [isAddOpen, setIsAddOpen] = useState(false)

  // Current routine to pass to the Live Workout session
  const [activeRoutineForSession, setActiveRoutineForSession] = useState<{
    name: string
    exercises: Array<{
      name: string
      category?: string
      sets?: number
      reps?: string | number
      restSeconds?: number
    }>
  } | null>(null)

  const handleStartRoutine = (routine: any) => {
    setActiveRoutineForSession(routine)
    setActiveTab("session")
  }

  const handleRefreshData = async () => {
    try {
      const res = await fetch("/api/fitness")
      if (res.ok) {
        const fresh = await res.json()
        setData(fresh)
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Action Buttons */}
      <div className="flex items-center justify-between pb-2">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {/* Tabs List */}
            <TabsList className="bg-secondary/70 p-1 rounded-xl border flex items-center justify-start overflow-x-auto no-scrollbar h-auto shadow-none w-full sm:w-fit">
              <TabsTrigger
                value="overview"
                className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Overview</span>
              </TabsTrigger>

              <TabsTrigger
                value="splits"
                className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>AI Splits & Studio</span>
              </TabsTrigger>

              <TabsTrigger
                value="session"
                className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current text-emerald-500" />
                <span>Live Tracker</span>
              </TabsTrigger>

              <TabsTrigger
                value="analytics"
                className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Analytics & 1RM</span>
              </TabsTrigger>

              <TabsTrigger
                value="history"
                className="gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-muted-foreground whitespace-nowrap"
              >
                <History className="w-3.5 h-3.5" />
                <span>Log History</span>
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
                Quick Log
              </Button>
            </div>
          </div>

          {/* Tab 1: Overview */}
          <TabsContent value="overview" className="mt-0 outline-none">
            <FitnessOverviewTab
              fitnessData={data}
              onStartSession={(routine) => {
                if (routine) setActiveRoutineForSession(routine)
                setActiveTab("session")
              }}
              onSwitchTab={setActiveTab}
            />
          </TabsContent>

          {/* Tab 2: AI Splits */}
          <TabsContent value="splits" className="mt-0 outline-none">
            <FitnessAiCoachTab onStartRoutine={handleStartRoutine} />
          </TabsContent>

          {/* Tab 3: Live Workout Tracker */}
          <TabsContent value="session" className="mt-0 outline-none">
            <FitnessLiveSession
              initialRoutine={activeRoutineForSession}
              onWorkoutSaved={handleRefreshData}
              onSwitchTab={setActiveTab}
            />
          </TabsContent>

          {/* Tab 4: Progressive Overload & Analytics */}
          <TabsContent value="analytics" className="mt-0 outline-none">
            <FitnessAnalyticsTab fitnessData={data} onMeasurementLogged={handleRefreshData} />
          </TabsContent>

          {/* Tab 5: History Log */}
          <TabsContent value="history" className="mt-0 outline-none">
            <FitnessLog initialData={data} />
          </TabsContent>
        </Tabs>
      </div>

      <AddFitnessDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onSuccess={handleRefreshData}
      />
    </div>
  )
}
