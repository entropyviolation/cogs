"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Download, Upload, RotateCcw } from "lucide-react"
import { useState } from "react"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tasks: any[]
  weeklyData: any
  categories: any[]
  onImportData: (data: any) => void
  onResetData: () => void
}

export function SettingsDialog({
  open,
  onOpenChange,
  tasks,
  weeklyData,
  categories,
  onImportData,
  onResetData,
}: SettingsDialogProps) {
  const [importText, setImportText] = useState("")

  const handleExport = () => {
    const data = {
      tasks,
      weeklyData,
      categories,
      exportDate: new Date().toISOString(),
    }

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
      const data = JSON.parse(importText)
      onImportData(data)
      setImportText("")
      onOpenChange(false)
    } catch (error) {
      alert("Invalid JSON format. Please check your data and try again.")
    }
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to reset all data? This cannot be undone.")) {
      onResetData()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Export Data</h3>
            <p className="text-sm text-muted-foreground">Download your habits data as a JSON file for backup.</p>
            <Button onClick={handleExport} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>

          {/* Import Data */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Import Data</h3>
            <p className="text-sm text-muted-foreground">Paste your exported JSON data to restore your habits.</p>
            <div className="space-y-2">
              <Label htmlFor="import-data">JSON Data</Label>
              <Textarea
                id="import-data"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste your exported JSON data here..."
                rows={6}
              />
            </div>
            <Button onClick={handleImport} disabled={!importText.trim()} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Import Data
            </Button>
          </div>

          {/* Reset Data */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-medium text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Reset all data including tasks, progress, and categories.</p>
            <Button onClick={handleReset} variant="destructive" className="w-full">
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
