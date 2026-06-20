/**
 * components/Home/Habits/settings-dialog.tsx — Habits & theme settings
 */
"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Download, Upload, RotateCcw } from "lucide-react"
import { useState } from "react"
import { useThemeStore, type ThemeColors } from "@/lib/theme-store"
import type { WeeklyTask, WeeklyData, Category } from "@/lib/types"

type HabitsImportData = {
  tasks: WeeklyTask[]
  weeklyData: WeeklyData
  weeklyHabitData?: WeeklyData
  monthlyHabitData?: WeeklyData
  categories?: Category[]
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: unknown[]
  weeklyData: unknown
  onImportData: (data: HabitsImportData) => void
  onResetData: () => void
}

const THEME_LABELS: { key: keyof ThemeColors; label: string }[] = [
  { key: "pointsAllTime", label: "All-time points" },
  { key: "pointsToday", label: "Today's points" },
  { key: "pointsWeek", label: "This week points" },
  { key: "pointsMonth", label: "This month points" },
  { key: "habitBoolean", label: "Yes/No habit icon" },
  { key: "habitGoal", label: "Goal-based habit icon" },
  { key: "habitText", label: "Text habit icon" },
  { key: "habitIncremental", label: "Incremental habit icon" },
]

export function SettingsDialog({
  open,
  onOpenChange,
  tasks,
  weeklyData,
  onImportData,
  onResetData,
}: SettingsDialogProps) {
  const [importText, setImportText] = useState("")
  const colors = useThemeStore((s) => s.colors)
  const setColor = useThemeStore((s) => s.setColor)
  const resetColors = useThemeStore((s) => s.resetColors)

  const handleExport = () => {
    const data = { tasks, weeklyData, exportDate: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `habits-backup-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      onImportData(JSON.parse(importText) as HabitsImportData)
      setImportText("")
      onOpenChange(false)
    } catch {
      alert("Invalid JSON format.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Theme colors</Label>
              <Button variant="ghost" size="sm" onClick={resetColors}>
                Reset defaults
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {THEME_LABELS.map(({ key, label }) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      value={colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-8 w-10 rounded border cursor-pointer"
                    />
                    <Input
                      value={colors[key]}
                      onChange={(e) => setColor(key, e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t pt-4">
            <Label className="text-base font-semibold">Backup & restore</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Reset all habit data?")) {
                    onResetData()
                    onOpenChange(false)
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset habits
              </Button>
            </div>
            <Textarea
              placeholder="Paste JSON to import…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={4}
            />
            <Button size="sm" onClick={handleImport} disabled={!importText.trim()}>
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
