/**
 * components/Lists/attribute-editor.tsx — Flexible item-attribute UI
 *
 * Schema + value editors for the expanded attribute type system (string, boolean,
 * color, datetime, list, multistring, number, selection, image, multiimage,
 * item, link, goal). Legacy types are normalized on read via attribute-utils.
 */
"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, X, ChevronUp, ChevronDown } from "lucide-react"
import type { AttributeDefinition, AttributeType, AttributeValue, GoalValue, TaskCategory } from "@/lib/types"
import {
  ATTRIBUTE_TYPE_LABELS,
  SCHEMA_ATTRIBUTE_TYPES,
  migrateAttributeDefinition,
  normalizeAttributeType,
} from "@/lib/attribute-utils"
import { useTaskStore } from "@/lib/task-store"
import { ListPicker } from "@/components/Lists/list-picker"

function asGoal(v: AttributeValue): GoalValue {
  if (v && typeof v === "object" && !Array.isArray(v)) return v as GoalValue
  return { current: 0, target: 0 }
}

function asArray(v: AttributeValue): string[] {
  return Array.isArray(v) ? (v as string[]) : []
}

function effectiveDef(def: AttributeDefinition): AttributeDefinition {
  return migrateAttributeDefinition(def)
}

export function mergeListAttributes(categories: TaskCategory[], categoryIds: string[] | undefined): AttributeDefinition[] {
  if (!categoryIds || categoryIds.length === 0) return []
  const byId = new Map<string, AttributeDefinition>()
  categoryIds.forEach((cid) => {
    const cat = categories.find((c) => c.id === cid)
    cat?.itemAttributes?.forEach((def) => {
      const migrated = effectiveDef(def)
      if (!byId.has(migrated.id)) byId.set(migrated.id, migrated)
    })
  })
  return Array.from(byId.values())
}

export function formatAttributeValue(def: AttributeDefinition, value: AttributeValue): string {
  if (value === undefined || value === null || value === "") return ""
  const d = effectiveDef(def)
  const type = normalizeAttributeType(d.type)
  switch (type) {
    case "boolean":
      return value ? "Yes" : "No"
    case "multistring":
    case "multiimage":
    case "selection":
      if (d.allowMultiple || type === "multistring" || type === "multiimage") return asArray(value).join(", ")
      return String(value)
    case "goal": {
      const g = asGoal(value)
      if (!g.target && !g.current) return ""
      return `${g.current}/${g.target}${d.unit ? " " + d.unit : ""}`
    }
    case "list":
    case "item": {
      const categories = useTaskStore.getState().categories
      const tasks = useTaskStore.getState().tasks
      if (type === "list") {
        const cat = categories.find((c) => c.id === value)
        return cat?.name || String(value)
      }
      const task = tasks.find((t) => t.id === value)
      return task?.description || String(value)
    }
    case "color":
      return String(value)
    case "image":
      return value ? "Image" : ""
    default:
      return `${value}${d.unit ? " " + d.unit : ""}`
  }
}

function slugId(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `attr_${Date.now()}`
  )
}

function TypeSpecificSchemaFields({
  def,
  onPatch,
}: {
  def: AttributeDefinition
  onPatch: (patch: Partial<AttributeDefinition>) => void
}) {
  const categories = useTaskStore((s) => s.categories)
  const type = normalizeAttributeType(def.type)

  switch (type) {
    case "boolean":
      return (
        <div className="w-28 space-y-1">
          <Label className="text-[10px]">Display</Label>
          <Select
            value={def.booleanDisplay || "checkbox"}
            onValueChange={(v) => onPatch({ booleanDisplay: v as "checkbox" | "switch" })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="switch">Toggle</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    case "number":
      return (
        <>
          <div className="w-20 space-y-1">
            <Label className="text-[10px]">Unit</Label>
            <Input value={def.unit || ""} onChange={(e) => onPatch({ unit: e.target.value })} className="h-8" placeholder="$" />
          </div>
          <label className="flex items-center gap-1 text-[10px] pb-1">
            <Checkbox checked={def.allowFloat !== false} onCheckedChange={(c) => onPatch({ allowFloat: !!c })} />
            Allow decimals
          </label>
        </>
      )
    case "datetime":
      return (
        <div className="w-28 space-y-1">
          <Label className="text-[10px]">Mode</Label>
          <Select
            value={def.datetimeMode || "date"}
            onValueChange={(v) => onPatch({ datetimeMode: v as "date" | "time" | "datetime" })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="datetime">Date & time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    case "selection":
      return (
        <>
          <label className="flex items-center gap-1 text-[10px] pb-1">
            <Checkbox checked={!!def.allowMultiple} onCheckedChange={(c) => onPatch({ allowMultiple: !!c })} />
            Allow multiple
          </label>
          <div className="w-28 space-y-1">
            <Label className="text-[10px]">Options from</Label>
            <Select
              value={def.optionSource || "manual"}
              onValueChange={(v) => onPatch({ optionSource: v as "manual" | "list" })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual list</SelectItem>
                <SelectItem value="list">App list</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {def.optionSource === "list" ? (
            <div className="flex-1 min-w-[140px] space-y-1">
              <Label className="text-[10px]">Source list</Label>
              <Select value={def.optionListId || "none"} onValueChange={(v) => onPatch({ optionListId: v === "none" ? undefined : v })}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Choose list…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="flex-1 min-w-[140px] space-y-1">
              <Label className="text-[10px]">Options (comma-separated)</Label>
              <Input
                value={(def.options || []).join(", ")}
                onChange={(e) => onPatch({ options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                className="h-8"
              />
            </div>
          )}
        </>
      )
    case "list":
    case "item":
      return (
        <div className="flex-1 min-w-[140px] space-y-1">
          <Label className="text-[10px]">Scope list (optional)</Label>
          <Select value={def.refListId || "any"} onValueChange={(v) => onPatch({ refListId: v === "any" ? undefined : v })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any list</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    case "goal":
      return (
        <div className="flex gap-2 min-w-[180px]">
          <div className="space-y-1">
            <Label className="text-[10px]">Current label</Label>
            <Input
              value={def.labels?.current || ""}
              placeholder="Actual"
              onChange={(e) => onPatch({ labels: { ...def.labels, current: e.target.value } })}
              className="h-8 w-24"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Target label</Label>
            <Input
              value={def.labels?.target || ""}
              placeholder="Goal"
              onChange={(e) => onPatch({ labels: { ...def.labels, target: e.target.value } })}
              className="h-8 w-24"
            />
          </div>
        </div>
      )
    default:
      return null
  }
}

export function AttributeSchemaEditor({
  value,
  onChange,
}: {
  value: AttributeDefinition[]
  onChange: (defs: AttributeDefinition[]) => void
}) {
  const update = (idx: number, patch: Partial<AttributeDefinition>) => {
    onChange(value.map((d, i) => (i === idx ? { ...d, ...patch } : d)))
  }
  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))
  const move = (idx: number, dir: -1 | 1) => {
    const next = idx + dir
    if (next < 0 || next >= value.length) return
    const copy = [...value]
    ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
    onChange(copy)
  }
  const add = () => onChange([...value, { id: `attr_${Date.now()}`, name: "New attribute", type: "string" }])

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">No attributes. Items in this list use only a name.</p>
      )}
      {value.map((rawDef, idx) => {
        const def = effectiveDef(rawDef)
        return (
          <div key={def.id} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
            <div className="flex flex-col gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === 0} onClick={() => move(idx, -1)} title="Move up">
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={idx === value.length - 1} onClick={() => move(idx, 1)} title="Move down">
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 min-w-[120px] space-y-1">
              <Label className="text-[10px]">Name</Label>
              <Input
                value={def.name}
                onChange={(e) =>
                  update(idx, { name: e.target.value, id: def.id.startsWith("attr_") ? slugId(e.target.value) : def.id })
                }
                className="h-8"
              />
            </div>
            <div className="w-32 space-y-1">
              <Label className="text-[10px]">Type</Label>
              <Select value={def.type} onValueChange={(v) => update(idx, { type: v as AttributeType })}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEMA_ATTRIBUTE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ATTRIBUTE_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TypeSpecificSchemaFields def={def} onPatch={(patch) => update(idx, patch)} />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(idx)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )
      })}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-4 w-4 mr-1" />
        Add attribute
      </Button>
    </div>
  )
}

function SelectionValueEditor({
  def,
  value,
  onChange,
}: {
  def: AttributeDefinition
  value: AttributeValue
  onChange: (v: AttributeValue) => void
}) {
  const tasks = useTaskStore((s) => s.tasks)

  const options = useMemo(() => {
    if (def.optionSource === "list" && def.optionListId) {
      return tasks.filter((t) => t.categories?.includes(def.optionListId!)).map((t) => t.description)
    }
    return def.options || []
  }, [def, tasks])

  if (def.allowMultiple) {
    const arr = asArray(value)
    return (
      <div className="flex flex-wrap gap-2 pt-1">
        {options.length === 0 && <span className="text-xs text-muted-foreground">No options defined.</span>}
        {options.map((o) => {
          const on = arr.includes(o)
          return (
            <label key={o} className="flex items-center gap-1 text-sm border rounded px-2 py-1 cursor-pointer">
              <Checkbox checked={on} onCheckedChange={(c) => onChange(c ? [...arr, o] : arr.filter((x) => x !== o))} />
              {o}
            </label>
          )
        })}
      </div>
    )
  }

  return (
    <Select value={(value as string) || "none"} onValueChange={(val) => onChange(val === "none" ? undefined : val)}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choose…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">—</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MultiStringEditor({ value, onChange }: { value: AttributeValue; onChange: (v: AttributeValue) => void }) {
  const arr = asArray(value)
  const add = () => onChange([...arr, ""])
  const setAt = (i: number, s: string) => {
    const next = [...arr]
    next[i] = s
    onChange(next.filter((x, idx) => x.trim() !== "" || idx === i))
  }
  const removeAt = (i: number) => onChange(arr.filter((_, idx) => idx !== i))

  return (
    <div className="space-y-1">
      {arr.map((s, i) => (
        <div key={i} className="flex gap-1">
          <Input value={s} onChange={(e) => setAt(i, e.target.value)} className="h-8" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAt(i)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add}>
        <Plus className="h-3 w-3 mr-1" />
        Add line
      </Button>
    </div>
  )
}

function ImageValueEditor({
  multiple,
  value,
  onChange,
}: {
  multiple: boolean
  value: AttributeValue
  onChange: (v: AttributeValue) => void
}) {
  const pick = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "image/*"
    input.multiple = multiple
    input.onchange = () => {
      const files = Array.from(input.files || [])
      if (!files.length) return
      Promise.all(
        files.map(
          (f) =>
            new Promise<string>((resolve) => {
              const r = new FileReader()
              r.onload = () => resolve(String(r.result))
              r.readAsDataURL(f)
            }),
        ),
      ).then((urls) => {
        if (multiple) onChange([...asArray(value), ...urls])
        else onChange(urls[0])
      })
    }
    input.click()
  }

  const urls = multiple ? asArray(value) : value ? [String(value)] : []

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <div key={i} className="relative border rounded overflow-hidden">
            <img src={url} alt="" className="h-16 w-16 object-cover" />
            <button
              type="button"
              className="absolute top-0 right-0 bg-black/50 text-white text-xs px-1"
              onClick={() => {
                if (multiple) onChange(urls.filter((_, idx) => idx !== i))
                else onChange(undefined)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <Button variant="outline" size="sm" onClick={pick}>
        {multiple ? "Add images" : "Choose image"}
      </Button>
    </div>
  )
}

function AttributeValueField({
  def,
  value,
  onChange,
}: {
  def: AttributeDefinition
  value: AttributeValue
  onChange: (v: AttributeValue) => void
}) {
  const tasks = useTaskStore((s) => s.tasks)
  const type = normalizeAttributeType(def.type)

  switch (type) {
    case "boolean":
      return def.booleanDisplay === "switch" ? (
        <Switch checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
      ) : (
        <Checkbox checked={!!value} onCheckedChange={(c) => onChange(!!c)} />
      )
    case "color":
      return (
        <div className="flex items-center gap-2">
          <Input type="color" value={(value as string) || "#3b82f6"} onChange={(e) => onChange(e.target.value)} className="h-9 w-14 p-1" />
          <Input value={(value as string) || ""} onChange={(e) => onChange(e.target.value)} className="h-9 flex-1" placeholder="#hex" />
        </div>
      )
    case "datetime": {
      const mode = def.datetimeMode || "date"
      const inputType = mode === "time" ? "time" : mode === "datetime" ? "datetime-local" : "date"
      return (
        <Input
          type={inputType}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          className="h-9"
        />
      )
    }
    case "list":
      return (
        <ListPicker
          mode="single"
          selected={value ? [String(value)] : []}
          onChange={(ids) => onChange(ids[0])}
          compact
        />
      )
    case "item": {
      const scoped = def.refListId ? tasks.filter((t) => t.categories?.includes(def.refListId!)) : tasks
      return (
        <Select value={(value as string) || "none"} onValueChange={(v) => onChange(v === "none" ? undefined : v)}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Choose item…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">—</SelectItem>
            {scoped.slice(0, 200).map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case "multistring":
      return <MultiStringEditor value={value} onChange={onChange} />
    case "selection":
      return <SelectionValueEditor def={def} value={value} onChange={onChange} />
    case "image":
      return <ImageValueEditor multiple={false} value={value} onChange={onChange} />
    case "multiimage":
      return <ImageValueEditor multiple value={value} onChange={onChange} />
    case "link":
      return (
        <Input
          type="url"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          className="h-9"
          placeholder="https://…"
        />
      )
    case "goal":
      return (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={asGoal(value).current || ""}
            placeholder={def.labels?.current || "Actual"}
            onChange={(e) => onChange({ ...asGoal(value), current: Number(e.target.value) || 0 })}
            className="h-9"
          />
          <span className="text-muted-foreground">/</span>
          <Input
            type="number"
            value={asGoal(value).target || ""}
            placeholder={def.labels?.target || "Goal"}
            onChange={(e) => onChange({ ...asGoal(value), target: Number(e.target.value) || 0 })}
            className="h-9"
          />
        </div>
      )
    case "number":
      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            step={def.allowFloat === false ? 1 : "any"}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => {
              const raw = e.target.value
              if (raw === "") onChange(undefined)
              else onChange(def.allowFloat === false ? parseInt(raw, 10) : Number(raw))
            }}
            className="h-9"
          />
          {def.unit && <span className="text-xs text-muted-foreground">{def.unit}</span>}
        </div>
      )
    case "string":
    default:
      return (
        <Textarea
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
          rows={2}
          className="min-h-[36px] resize-y"
        />
      )
  }
}

export function AttributeValuesEditor({
  definitions,
  values,
  onChange,
}: {
  definitions: AttributeDefinition[]
  values: Record<string, AttributeValue>
  onChange: (values: Record<string, AttributeValue>) => void
}) {
  if (definitions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        This item's lists don't define any attributes yet. Add some in a list's settings.
      </p>
    )
  }
  const set = (id: string, v: AttributeValue) => onChange({ ...values, [id]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {definitions.map((rawDef) => {
        const def = effectiveDef(rawDef)
        const v = values[def.id]
        return (
          <div key={def.id} className="space-y-1">
            <Label className="text-xs font-medium">{def.name}</Label>
            <AttributeValueField def={def} value={v} onChange={(nv) => set(def.id, nv)} />
          </div>
        )
      })}
    </div>
  )
}

/** Standalone editor for ad-hoc attribute pairs (e.g. inbox advanced). */
export function AdHocAttributesEditor({
  definitions,
  values,
  onDefinitionsChange,
  onValuesChange,
}: {
  definitions: AttributeDefinition[]
  values: Record<string, AttributeValue>
  onDefinitionsChange: (defs: AttributeDefinition[]) => void
  onValuesChange: (values: Record<string, AttributeValue>) => void
}) {
  const addPair = () => {
    const id = `attr_${Date.now()}`
    onDefinitionsChange([...definitions, { id, name: "Attribute", type: "string" }])
    onValuesChange({ ...values, [id]: "" })
  }

  const removePair = (id: string) => {
    onDefinitionsChange(definitions.filter((d) => d.id !== id))
    const next = { ...values }
    delete next[id]
    onValuesChange(next)
  }

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Custom attributes</Label>
        <Button variant="outline" size="sm" onClick={addPair}>
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>
      {definitions.length === 0 && (
        <p className="text-xs text-muted-foreground">No custom attributes. Add name/value pairs for this item.</p>
      )}
      {definitions.map((def, idx) => (
        <div key={def.id} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start border rounded p-2">
          <Input
            value={def.name}
            placeholder="Name"
            onChange={(e) => {
              const name = e.target.value
              onDefinitionsChange(definitions.map((d, i) => (i === idx ? { ...d, name } : d)))
            }}
            className="h-8"
          />
          <Select
            value={def.type}
            onValueChange={(v) =>
              onDefinitionsChange(definitions.map((d, i) => (i === idx ? { ...d, type: v as AttributeType } : d)))
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEMA_ATTRIBUTE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {ATTRIBUTE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 items-start">
            <div className="flex-1">
              <AttributeValueField def={def} value={values[def.id]} onChange={(v) => onValuesChange({ ...values, [def.id]: v })} />
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removePair(def.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
