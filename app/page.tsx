/**
 * app/page.tsx — Application root page
 *
 * The single page of the app. Renders the global header (title + Cognitive State,
 * Inbox, Bulk Add, Quick Add) and the top-level tab bar (Home, Next Actions,
 * Scheduler, Analytics), lazy-loading each module panel for fast startup. When a
 * task is selected it swaps to the full-screen task detail view.
 *
 * Spec: §2.2 (module hosting) and §8.2 (dashboard top bar / global quick actions).
 */
"use client"

import { useState, useCallback, lazy, Suspense } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QuickAdd } from "@/components/quick-add"
import { EnhancedBulkAdd } from "@/components/enhanced-bulk-add"
import { CognitiveState } from "@/components/cognitive-state"
import { Inbox } from "@/components/inbox"
import { EnhancedTaskDetail } from "@/components/enhanced-task-detail"
import { Reviews } from "@/components/Reviews/reviews"

// Lazy load components to improve initial load time
const HomeDashboard = lazy(() => import("@/components/Home/home-dashboard").then((mod) => ({ default: mod.HomeDashboard })))
const EnhancedCategoryView = lazy(() =>
  import("@/components/Lists/enhanced-category-view").then((mod) => ({ default: mod.EnhancedCategoryView })),
)
const EnhancedScheduler = lazy(() =>
  import("@/components/Scheduler/enhanced-scheduler").then((mod) => ({ default: mod.EnhancedScheduler })),
)

const EnhancedAnalytics = lazy(() =>
  import("@/components/Analytics/enhanced-analytics").then((mod) => ({ default: mod.EnhancedAnalytics })),
)
const ModulesPanel = lazy(() => import("@/components/Modules/modules-panel").then((mod) => ({ default: mod.ModulesPanel })))

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
        <div className="container mx-auto px-6 py-6 sm:px-8 lg:px-12">
          <EnhancedTaskDetail taskId={selectedTaskId} onBack={handleBackToList} />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">COGS</h1>
          <div className="flex items-center gap-4">
            <Reviews />
            <CognitiveState />
            <Inbox onTaskSelect={handleTaskSelect} />
            <EnhancedBulkAdd />
            <QuickAdd />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="home">Home</TabsTrigger>
            <TabsTrigger value="categories">Lists</TabsTrigger>
            <TabsTrigger value="scheduler">Scheduler</TabsTrigger>
            <TabsTrigger value="modules">Modules</TabsTrigger>
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

            {activeTab === "modules" && (
              <TabsContent value="modules">
                <ModulesPanel onTaskSelect={handleTaskSelect} />
              </TabsContent>
            )}

            {activeTab === "analytics" && (
              <TabsContent value="analytics">
                <EnhancedAnalytics />
              </TabsContent>
            )}

          </Suspense>
        </Tabs>
      </div>
    </main>
  )
}
