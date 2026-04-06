"use client"

import { useState, useCallback, lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuickAdd } from "@/components/quick-add"
import { EnhancedBulkAdd } from "@/components/enhanced-bulk-add"
import { CognitiveState } from "@/components/cognitive-state"
import { Inbox } from "@/components/inbox"
import { EnhancedTaskDetail } from "@/components/enhanced-task-detail"

// Lazy load components to improve initial load time
const HomeDashboard = lazy(() => import("@/components/Home/home-dashboard").then((mod) => ({ default: mod.HomeDashboard })))
const EnhancedCategoryView = lazy(() =>
  import("@/components/NextActions/enhanced-category-view").then((mod) => ({ default: mod.EnhancedCategoryView })),
)
const EnhancedScheduler = lazy(() =>
  import("@/components/Scheduler/enhanced-scheduler").then((mod) => ({ default: mod.EnhancedScheduler })),
)

const EnhancedAnalytics = lazy(() =>
  import("@/components/Analytics/enhanced-analytics").then((mod) => ({ default: mod.EnhancedAnalytics })),
)
const TrackingPanel = lazy(() => import("@/components/Tracking/tracking-panel").then((mod) => ({ default: mod.TrackingPanel })))
const OperationsPanel = lazy(() => import("@/components/Operations/operations-panel").then((mod) => ({ default: mod.OperationsPanel })))

// Loading fallback
const LoadingFallback = () => (
  <div className="w-full h-64 flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
)

export default function Home() {
  const [activeTab, setActiveTab] = useState("home")
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
    setSelectedTaskId(null) // Clear task selection when changing tabs
  }, [])

  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId)
  }, [])

  const handleBackToList = useCallback(() => {
    setSelectedTaskId(null)
  }, [])

  // If a task is selected, show the task detail view
  if (selectedTaskId) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto py-4">
          <EnhancedTaskDetail taskId={selectedTaskId} onBack={handleBackToList} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">COGS</h1>
          <div className="flex items-center gap-4">
            <CognitiveState />
            <Inbox onTaskSelect={handleTaskSelect} />
            <EnhancedBulkAdd />
            <QuickAdd />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="categories">Next Actions</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <Suspense fallback={<LoadingFallback />}>
            {activeTab === "home" && (
              <TabsContent value="home">
                <HomeDashboard />
              </TabsContent>
            )}

            {activeTab === "categories" && (
              <TabsContent value="categories">
                <EnhancedCategoryView onTaskSelect={handleTaskSelect} />
              </TabsContent>
            )}

            {activeTab === "scheduler" && (
              <TabsContent value="scheduler">
                <EnhancedScheduler />
              </TabsContent>
            )}

            {activeTab === "tracking" && (
              <TabsContent value="tracking">
                <TrackingPanel />
              </TabsContent>
            )}

            {activeTab === "analytics" && (
              <TabsContent value="analytics">
                <EnhancedAnalytics />
              </TabsContent>
            )}

            {activeTab === "operations" && (
              <TabsContent value="operations">
                <OperationsPanel />
              </TabsContent>
            )}
          </Suspense>
        </Tabs>
      </div>
    </main>
  )
}
