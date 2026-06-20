/**
 * components/cognitive-state.tsx — Header tracking quick-entry
 *
 * The global-header button that opens the TimeGrid life tracker (see
 * components/Home/Tracking/time-grid.tsx). This replaces the old slider-based
 * cognitive-state form: state, mood, location, activity, etc. are now all
 * captured by painting the day's minute grid per scope. The export name is kept
 * as `CognitiveState` so the header wiring in app/page.tsx is unchanged.
 *
 * Spec: §8.2 (dashboard top bar), §12 (Tracking).
 */
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Brain } from "lucide-react"
import { TimeGrid } from "@/components/Home/Tracking/time-grid"

export function CognitiveState() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Brain className="h-4 w-4" />
          <span>Tracking</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Time Tracking</DialogTitle>
          <DialogDescription>
            Pick a scope and pen, then drag across the grid (or type a range) to log how you spent your time.
          </DialogDescription>
        </DialogHeader>
        <TimeGrid compact />
      </DialogContent>
    </Dialog>
  )
}
