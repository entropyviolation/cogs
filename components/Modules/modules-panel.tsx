/**
 * components/Modules/modules-panel.tsx — The "Modules" dashboard
 *
 * Renders the user's composable modules (see lib/modules-store). Each module
 * pulls live data from the rest of the app and presents it a chosen way:
 *   - list-explorer: surfaces a random item from a list (reading-list explorer,
 *     cleaning picker, …) with a "Surprise me" reroll;
 *   - writing-prompt: a writing-assignment generator (optionally seeded by a
 *     list of topics);
 *   - random-task: picks something to do now from your open tasks;
 *   - list-summary: progress on a list;
 *   - analytics-stat: a single headline number (points, tasks, habits).
 * Users add / remove / reconfigure modules; everything persists.
 */
"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RefreshCw, X, Settings, Plus, BookOpen, PenLine, BarChart3, ListChecks, Shuffle, Workflow, Trash2 } from "lucide-react"
import { useTaskStore } from "@/lib/task-store"
import { usePointsStore } from "@/lib/points-store"
import { useHabitsStore } from "@/lib/habits-store"
import {
  useModulesStore,
  type ModuleInstance,
  type ModuleType,
  type AttrRule,
  type RuleOperator,
} from "@/lib/modules-store"
import type { Task, AttributeValue } from "@/lib/types"
import { mergeListAttributes, formatAttributeValue } from "@/components/Lists/attribute-editor"
import { formatDateKey } from "@/lib/date-utils"

const rand = <T,>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined)

const randN = <T,>(arr: T[], n: number): T[] => {
  if (n <= 0 || arr.length === 0) return []
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, Math.min(n, copy.length))
}

const WRITING_FORMS = ["a short story", "an essay", "a poem", "a journal entry", "an open letter", "a scene of dialogue"]
const WRITING_TOPICS = [
  "a door that shouldn't be open",
  "the last day of summer",
  "an unexpected kindness",
  "a machine that feels",
  "a memory you can't trust",
  "the city at 3am",
  "two people, one umbrella",
  "what the ocean remembers",
  "a promise made and broken",
  "the smell of rain",
]
const WRITING_CONSTRAINTS = [
  "in under 300 words",
  "from an unexpected point of view",
  "without using the word 'I'",
  "set fifty years in the future",
  "that ends with a question",
  "using only the present tense",
]

const MODULE_META: Record<ModuleType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  "list-explorer": { label: "List Explorer", icon: BookOpen },
  "writing-prompt": { label: "Writing Generator", icon: PenLine },
  "list-summary": { label: "List Summary", icon: ListChecks },
  "analytics-stat": { label: "Analytics Stat", icon: BarChart3 },
  "random-task": { label: "Random Task", icon: Shuffle },
  rules: { label: "Rules / Cause→Effect", icon: Workflow },
}

const RULE_OPERATORS: RuleOperator[] = [">", ">=", "<", "<=", "=", "contains", "is empty", "is set"]
const rid = () => `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

// Evaluate a single rule against an attribute value (the "cause").
function ruleMatches(rule: AttrRule, value: AttributeValue): boolean {
  const present = !(value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))
  switch (rule.op) {
    case "is set":
      return present
    case "is empty":
      return !present
    case "contains":
      return String(value ?? "").toLowerCase().includes((rule.value || "").toLowerCase())
    case "=":
      return String(value ?? "") === (rule.value || "")
    default: {
      const a = Number(typeof value === "object" ? (value as any)?.current : value)
      const b = Number(rule.value)
      if (isNaN(a) || isNaN(b)) return false
      if (rule.op === ">") return a > b
      if (rule.op === ">=") return a >= b
      if (rule.op === "<") return a < b
      if (rule.op === "<=") return a <= b
      return false
    }
  }
}

const STAT_OPTIONS: { value: string; label: string }[] = [
  { value: "points-total", label: "Total points" },
  { value: "points-week", label: "Points this week" },
  { value: "points-today", label: "Points today" },
  { value: "tasks-open", label: "Open tasks" },
  { value: "tasks-done", label: "Completed tasks" },
  { value: "habits-today", label: "Habits logged today" },
]

interface ModulesPanelProps {
  onTaskSelect?: (taskId: string) => void
}

export function ModulesPanel({ onTaskSelect }: ModulesPanelProps) {
  const modules = useModulesStore((s) => s.modules)
  const addModule = useModulesStore((s) => s.addModule)
  const removeModule = useModulesStore((s) => s.removeModule)
  const updateModule = useModulesStore((s) => s.updateModule)

  const [editing, setEditing] = useState<ModuleInstance | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Modules</h2>
          <p className="text-sm text-muted-foreground">Composable views built from your lists, tasks, and stats.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Module
        </Button>
      </div>

      {modules.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No modules yet. Add one to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <ModuleCard
              key={m.id}
              module={m}
              onConfigure={() => setEditing(m)}
              onRemove={() => removeModule(m.id)}
              onTaskSelect={onTaskSelect}
            />
          ))}
        </div>
      )}

      <ModuleConfigDialog
        open={adding}
        onClose={() => setAdding(false)}
        onSave={(draft) => {
          addModule(draft)
          setAdding(false)
        }}
      />
      <ModuleConfigDialog
        open={!!editing}
        initial={editing || undefined}
        onClose={() => setEditing(null)}
        onSave={(draft) => {
          if (editing) updateModule(editing.id, draft)
          setEditing(null)
        }}
      />
    </div>
  )
}

function ModuleCard({
  module,
  onConfigure,
  onRemove,
  onTaskSelect,
}: {
  module: ModuleInstance
  onConfigure: () => void
  onRemove: () => void
  onTaskSelect?: (taskId: string) => void
}) {
  const Meta = MODULE_META[module.type]
  const Icon = Meta.icon
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{module.title}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onConfigure} title="Configure">
              <Settings className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove} title="Remove">
              <X className="h-3.5 w-3.5" />
            </Button>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <ModuleBody module={module} onTaskSelect={onTaskSelect} />
      </CardContent>
    </Card>
  )
}

function ModuleBody({ module, onTaskSelect }: { module: ModuleInstance; onTaskSelect?: (taskId: string) => void }) {
  switch (module.type) {
    case "analytics-stat":
      return <AnalyticsStat stat={module.config.stat || "points-week"} />
    case "list-summary":
      return <ListSummary categoryId={module.config.categoryId} />
    case "writing-prompt":
      return <WritingPrompt categoryId={module.config.categoryId} />
    case "list-explorer":
      return (
        <ListExplorer
          categoryId={module.config.categoryId}
          framing={module.config.framing}
          pickCount={module.config.pickCount ?? 1}
          onTaskSelect={onTaskSelect}
        />
      )
    case "random-task":
      return <RandomTask categoryId={module.config.categoryId} onTaskSelect={onTaskSelect} />
    case "rules":
      return <RulesModule categoryId={module.config.categoryId} rules={module.config.rules} onTaskSelect={onTaskSelect} />
    default:
      return null
  }
}

function RulesModule({
  categoryId,
  rules,
  onTaskSelect,
}: {
  categoryId?: string
  rules?: AttrRule[]
  onTaskSelect?: (taskId: string) => void
}) {
  const tasks = useTaskStore((s) => s.tasks)
  const categories = useTaskStore((s) => s.categories)
  const items = useMemo(() => tasksInList(tasks, categoryId), [tasks, categoryId])
  const defs = useMemo(() => mergeListAttributes(categories, categoryId ? [categoryId] : []), [categories, categoryId])

  if (!categoryId) return <p className="text-sm text-muted-foreground">Configure a list and rules.</p>
  if (!rules || rules.length === 0) return <p className="text-sm text-muted-foreground">No rules yet — configure this module.</p>
  if (items.length === 0) return <p className="text-sm text-muted-foreground">This list is empty.</p>

  return (
    <div className="space-y-2 max-h-72 overflow-auto">
      {items.map((item) => {
        const matched = rules.find((r) => ruleMatches(r, item.attributes?.[r.attrId]))
        return (
          <button
            key={item.id}
            className="w-full text-left flex items-center justify-between gap-2 border rounded px-2 py-1.5 hover:bg-muted/50"
            onClick={() => onTaskSelect?.(item.id)}
          >
            <span className="text-sm truncate flex-1">{item.description}</span>
            {matched ? (
              <Badge style={{ background: matched.color, color: "#fff" }} className="shrink-0">
                {matched.label}
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground shrink-0">—</span>
            )}
          </button>
        )
      })}
      <div className="pt-1 text-[10px] text-muted-foreground">
        {defs.length} attributes · {rules.length} rules
      </div>
    </div>
  )
}

function tasksInList(tasks: Task[], categoryId?: string): Task[] {
  if (!categoryId) return tasks
  return tasks.filter((t) => t.categories?.includes(categoryId))
}

function AnalyticsStat({ stat }: { stat: string }) {
  const tasks = useTaskStore((s) => s.tasks)
  const pointsHistory = usePointsStore((s) => s.pointsHistory)
  const getTotalPoints = usePointsStore((s) => s.getTotalPoints)
  const getWeekPoints = usePointsStore((s) => s.getWeekPoints)
  const getDayPoints = usePointsStore((s) => s.getDayPoints)
  const weeklyData = useHabitsStore((s) => s.weeklyData)

  const { value, label } = useMemo(() => {
    const today = new Date()
    switch (stat) {
      case "points-total":
        return { value: getTotalPoints(), label: "points all-time" }
      case "points-today":
        return { value: getDayPoints(today), label: "points today" }
      case "tasks-open":
        return { value: tasks.filter((t) => !t.completed).length, label: "open tasks" }
      case "tasks-done":
        return { value: tasks.filter((t) => t.completed).length, label: "completed tasks" }
      case "habits-today": {
        const day = weeklyData[formatDateKey(today)] || {}
        const n = Object.values(day).filter(
          (c) => c && (c.completed || c.value !== undefined || c.text || c.incrementalValues),
        ).length
        return { value: n, label: "habits logged today" }
      }
      case "points-week":
      default:
        return { value: getWeekPoints(today), label: "points this week" }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stat, tasks, pointsHistory, weeklyData])

  return (
    <div className="py-4 text-center">
      <div className="text-4xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  )
}

function ListSummary({ categoryId }: { categoryId?: string }) {
  const tasks = useTaskStore((s) => s.tasks)
  const categories = useTaskStore((s) => s.categories)
  const cat = categories.find((c) => c.id === categoryId)
  const items = tasksInList(tasks, categoryId)
  const done = items.filter((t) => t.completed).length
  const pct = items.length ? Math.round((done / items.length) * 100) : 0

  if (!categoryId) return <p className="text-sm text-muted-foreground">Configure a list to summarize.</p>
  return (
    <div className="space-y-2">
      {cat && (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
          {cat.name}
        </div>
      )}
      <div className="text-3xl font-bold">
        {done}/{items.length}
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-muted-foreground">{pct}% complete · {items.length - done} remaining</p>
    </div>
  )
}

function WritingPrompt({ categoryId }: { categoryId?: string }) {
  const tasks = useTaskStore((s) => s.tasks)
  const [nonce, setNonce] = useState(0)

  const prompt = useMemo(() => {
    const form = rand(WRITING_FORMS) || "a short piece"
    const sourceItems = categoryId ? tasksInList(tasks, categoryId).map((t) => t.description) : []
    const topic = (sourceItems.length ? rand(sourceItems) : rand(WRITING_TOPICS)) || "anything"
    const constraint = rand(WRITING_CONSTRAINTS) || ""
    return { form, topic, constraint }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, categoryId, tasks])

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed">
        Write <span className="font-semibold">{prompt.form}</span> about{" "}
        <span className="font-semibold">{prompt.topic}</span>, {prompt.constraint}.
      </p>
      <Button variant="outline" size="sm" onClick={() => setNonce((n) => n + 1)}>
        <RefreshCw className="h-3.5 w-3.5 mr-2" />
        New prompt
      </Button>
    </div>
  )
}

function ListExplorer({
  categoryId,
  framing,
  pickCount = 1,
  onTaskSelect,
}: {
  categoryId?: string
  framing?: string
  pickCount?: number
  onTaskSelect?: (taskId: string) => void
}) {
  const tasks = useTaskStore((s) => s.tasks)
  const items = useMemo(() => tasksInList(tasks, categoryId).filter((t) => !t.completed), [tasks, categoryId])
  const [pickIds, setPickIds] = useState<string[]>([])

  const repick = () => {
    setPickIds(randN(items, pickCount).map((i) => i.id))
  }

  useEffect(() => {
    setPickIds((prev) => {
      const valid = prev.filter((id) => items.some((i) => i.id === id))
      if (valid.length >= Math.min(pickCount, items.length)) return valid.slice(0, pickCount)
      return randN(items, pickCount).map((i) => i.id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, items.length, pickCount])

  const picks = pickIds.map((id) => items.find((i) => i.id === id)).filter(Boolean)

  if (!categoryId) return <p className="text-sm text-muted-foreground">Configure a list to explore.</p>
  if (items.length === 0) return <p className="text-sm text-muted-foreground">This list is empty.</p>

  return (
    <div className="space-y-3">
      {picks.length > 0 ? (
        <div className="space-y-2">
          {picks.map((pick) =>
            pick ? (
              <button
                key={pick.id}
                className="text-left w-full"
                onClick={() => onTaskSelect?.(pick.id)}
                title="Open item"
              >
                <p className="text-sm font-semibold leading-snug hover:underline">
                  {framing ? `${framing}: ` : ""}
                  {pick.description}
                </p>
                {pick.attributes && Object.keys(pick.attributes).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(pick.attributes).map(([k, v]) =>
                      v === undefined || v === null || v === "" ? null : (
                        <Badge key={k} variant="secondary" className="text-[10px]">
                          {String(v)}
                        </Badge>
                      ),
                    )}
                  </div>
                )}
              </button>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tap below to pick.</p>
      )}
      <Button variant="outline" size="sm" onClick={repick}>
        <RefreshCw className="h-3.5 w-3.5 mr-2" />
        Surprise me{pickCount > 1 ? ` (${pickCount})` : ""}
      </Button>
    </div>
  )
}

function RandomTask({ categoryId, onTaskSelect }: { categoryId?: string; onTaskSelect?: (taskId: string) => void }) {
  const tasks = useTaskStore((s) => s.tasks)
  const updateTask = useTaskStore((s) => s.updateTask)
  const open = useMemo(() => tasksInList(tasks, categoryId).filter((t) => !t.completed), [tasks, categoryId])
  const [pickId, setPickId] = useState<string | null>(null)

  useEffect(() => {
    setPickId((prev) => (prev && open.some((i) => i.id === prev) ? prev : rand(open)?.id ?? null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, open.length])

  const pick = open.find((i) => i.id === pickId)

  if (open.length === 0) return <p className="text-sm text-muted-foreground">No open tasks. All clear!</p>

  return (
    <div className="space-y-3">
      {pick && (
        <button className="text-left w-full" onClick={() => onTaskSelect?.(pick.id)} title="Open task">
          <p className="text-sm font-semibold hover:underline">{pick.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {pick.estimatedDuration}m · importance {pick.importance}
          </p>
        </button>
      )}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setPickId(rand(open)?.id ?? null)}>
          <Shuffle className="h-3.5 w-3.5 mr-2" />
          Another
        </Button>
        {pick && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateTask({ ...pick, completed: true })
              setPickId(null)
            }}
          >
            Mark done
          </Button>
        )}
      </div>
    </div>
  )
}

function ModuleConfigDialog({
  open,
  initial,
  onClose,
  onSave,
}: {
  open: boolean
  initial?: ModuleInstance
  onClose: () => void
  onSave: (draft: Omit<ModuleInstance, "id">) => void
}) {
  const categories = useTaskStore((s) => s.categories)
  const [type, setType] = useState<ModuleType>(initial?.type || "list-explorer")
  const [title, setTitle] = useState(initial?.title || "")
  const [categoryId, setCategoryId] = useState<string | undefined>(initial?.config.categoryId)
  const [stat, setStat] = useState<string>(initial?.config.stat || "points-week")
  const [framing, setFraming] = useState<string>(initial?.config.framing || "")
  const [pickCount, setPickCount] = useState<number>(initial?.config.pickCount ?? 1)
  const [rules, setRules] = useState<AttrRule[]>(initial?.config.rules || [])

  useEffect(() => {
    if (open) {
      setType(initial?.type || "list-explorer")
      setTitle(initial?.title || "")
      setCategoryId(initial?.config.categoryId)
      setStat(initial?.config.stat || "points-week")
      setFraming(initial?.config.framing || "")
      setPickCount(initial?.config.pickCount ?? 1)
      setRules(initial?.config.rules || [])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const needsList = type === "list-explorer" || type === "list-summary" || type === "random-task" || type === "rules"
  const optionalList = type === "writing-prompt"

  const attrDefs = useMemo(
    () => mergeListAttributes(categories, categoryId ? [categoryId] : []),
    [categories, categoryId],
  )

  const handleSave = () => {
    const finalTitle = title.trim() || MODULE_META[type].label
    onSave({
      type,
      title: finalTitle,
      config: {
        categoryId: needsList || optionalList ? categoryId : undefined,
        stat: type === "analytics-stat" ? stat : undefined,
        framing: type === "list-explorer" ? framing.trim() || undefined : undefined,
        pickCount: type === "list-explorer" ? Math.max(1, pickCount) : undefined,
        rules: type === "rules" ? rules : undefined,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Configure Module" : "Add Module"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as ModuleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(MODULE_META) as ModuleType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {MODULE_META[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={MODULE_META[type].label} />
          </div>

          {(needsList || optionalList) && (
            <div className="space-y-2">
              <Label>{optionalList ? "Topic source list (optional)" : "List"}</Label>
              <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? undefined : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a list" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{optionalList ? "Built-in topics" : "Choose a list"}</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "list-explorer" && (
            <>
              <div className="space-y-2">
                <Label>Framing verb (optional)</Label>
                <Input value={framing} onChange={(e) => setFraming(e.target.value)} placeholder="e.g. Read, Clean, Cook" />
              </div>
              <div className="space-y-2">
                <Label>Number of random items</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={pickCount}
                  onChange={(e) => setPickCount(Math.max(1, Number.parseInt(e.target.value) || 1))}
                />
              </div>
            </>
          )}

          {type === "analytics-stat" && (
            <div className="space-y-2">
              <Label>Stat</Label>
              <Select value={stat} onValueChange={setStat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === "rules" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rules (cause → effect)</Label>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!categoryId || attrDefs.length === 0}
                  onClick={() =>
                    setRules((rs) => [
                      ...rs,
                      { id: rid(), attrId: attrDefs[0]?.id || "", op: ">", value: "", label: "Flag", color: "#ef4444" },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Rule
                </Button>
              </div>
              {!categoryId && <p className="text-xs text-muted-foreground">Pick a list first.</p>}
              {categoryId && attrDefs.length === 0 && (
                <p className="text-xs text-muted-foreground">This list has no attributes to build rules from.</p>
              )}
              <div className="space-y-2 max-h-64 overflow-auto">
                {rules.map((r, i) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-1 border rounded p-2">
                    <span className="text-xs text-muted-foreground">If</span>
                    <select
                      className="border rounded h-8 px-1 text-xs bg-background"
                      value={r.attrId}
                      onChange={(e) => setRules((rs) => rs.map((x, xi) => (xi === i ? { ...x, attrId: e.target.value } : x)))}
                    >
                      {attrDefs.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border rounded h-8 px-1 text-xs bg-background"
                      value={r.op}
                      onChange={(e) =>
                        setRules((rs) => rs.map((x, xi) => (xi === i ? { ...x, op: e.target.value as RuleOperator } : x)))
                      }
                    >
                      {RULE_OPERATORS.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                    {r.op !== "is set" && r.op !== "is empty" && (
                      <Input
                        value={r.value || ""}
                        onChange={(e) => setRules((rs) => rs.map((x, xi) => (xi === i ? { ...x, value: e.target.value } : x)))}
                        className="h-8 w-20"
                        placeholder="value"
                      />
                    )}
                    <span className="text-xs text-muted-foreground">→</span>
                    <Input
                      value={r.label}
                      onChange={(e) => setRules((rs) => rs.map((x, xi) => (xi === i ? { ...x, label: e.target.value } : x)))}
                      className="h-8 w-24"
                      placeholder="label"
                    />
                    <input
                      type="color"
                      value={r.color}
                      onChange={(e) => setRules((rs) => rs.map((x, xi) => (xi === i ? { ...x, color: e.target.value } : x)))}
                      className="h-8 w-9"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setRules((rs) => rs.filter((_, xi) => xi !== i))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Rules are checked top-to-bottom; the first match decides the item's badge.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>{initial ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
