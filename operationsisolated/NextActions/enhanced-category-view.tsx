"use client"

import { DialogTrigger } from "@/components/ui/dialog"

import type React from "react"
import { Settings, GripVertical } from "lucide-react"

import { useState, useMemo, useCallback } from "react"
import { useTaskStore } from "@/lib/task-store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Edit, Trash, Check, Calendar, AlertTriangle, Star, FolderPlus, Eye, Plus, CheckCircle2 } from "lucide-react"
import type { TaskCategory, Task } from "@/lib/types"
import { safeDateFormat } from "@/lib/date-utils"
import { TaskDetailPopup } from "@/components/task-detail-popup"
import { NextActionsSettingsDialog } from "@/components/NextActions/settings-dialog"
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
} from "@/components/ui/sidebar"

interface EnhancedCategoryViewProps {
  onTaskSelect: (taskId: string) => void
}

// Completed Tasks Dialog
function CompletedTasksDialog({
  open,
  onClose,
  onTaskSelect,
}: {
  open: boolean
  onClose: () => void
  onTaskSelect: (taskId: string) => void
}) {
  const allTasks = useTaskStore((state) => state.tasks)
  const categories = useTaskStore((state) => state.categories)

  const completedTasks = useMemo(() => {
    return allTasks
      .filter((task) => task.completed)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [allTasks])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Completed Tasks ({completedTasks.length})
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No completed tasks yet!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    onTaskSelect(task.id)
                    onClose()
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium line-through text-muted-foreground">{task.description}</p>
                        <div className="flex gap-2 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {safeDateFormat(task.createdAt)}
                          </div>
                          {task.actualDuration && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3" />
                              {task.actualDuration}m
                            </div>
                          )}
                        </div>
                        {task.categories && task.categories.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {task.categories.slice(0, 3).map((categoryId) => {
                              const category = categories.find((c) => c.id === categoryId)
                              return category ? (
                                <Badge key={categoryId} variant="outline" className="text-xs">
                                  {category.name}
                                </Badge>
                              ) : null
                            })}
                            {task.categories.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{task.categories.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function EnhancedCategoryView({ onTaskSelect }: EnhancedCategoryViewProps) {
  const allTasks = useTaskStore((state) => state.tasks)
  const categories = useTaskStore((state) => state.categories)
  const folders = useTaskStore((state) => state.folders)
  const addFolder = useTaskStore((state) => state.addFolder)
  const updateFolder = useTaskStore((state) => state.updateFolder)
  const deleteFolder = useTaskStore((state) => state.deleteFolder)
  const addCategoryToFolder = useTaskStore((state) => state.addCategoryToFolder)
  const removeCategoryFromFolder = useTaskStore((state) => state.removeCategoryFromFolder)
  const addCategory = useTaskStore((state) => state.addCategory)
  const updateCategory = useTaskStore((state) => state.updateCategory)
  const deleteCategory = useTaskStore((state) => state.deleteCategory)
  const updateTask = useTaskStore((state) => state.updateTask)
  const addTask = useTaskStore((state) => state.addTask)

  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6")
  const [searchTerm, setSearchTerm] = useState("")
  const [addingTaskToCategory, setAddingTaskToCategory] = useState<string | null>(null)
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showCategorySettings, setShowCategorySettings] = useState(false)
  const [showCompletedTasks, setShowCompletedTasks] = useState(false)
  // New state for folder navigation and selection
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null) // null = Home
  const [selectMode, setSelectMode] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [newFolderName, setNewFolderName] = useState("")
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false)

  // Filter categories by folder
  const visibleCategories = useMemo(() => {
    if (!selectedFolderId) return categories
    const folder = folders.find((f) => f.id === selectedFolderId)
    if (!folder) return []
    return categories.filter((cat) => folder.categoryIds.includes(cat.id))
  }, [categories, folders, selectedFolderId])

  // Sort categories by order
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => (a.order || 0) - (b.order || 0))
  }, [categories])

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return sortedCategories
    return sortedCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
  }, [sortedCategories, searchTerm])

  // Get tasks for a specific category
  const getTasksForCategory = useCallback(
    (categoryId: string) => {
      return allTasks.filter((task) => task.categories?.includes(categoryId) && !task.completed)
    },
    [allTasks],
  )

  // Get completion rate for a category
  const getCategoryCompletionRate = useCallback(
    (categoryId: string) => {
      const categoryTasks = allTasks.filter((task) => task.categories?.includes(categoryId))
      if (categoryTasks.length === 0) return 0
      const completedTasks = categoryTasks.filter((task) => task.completed)
      return Math.round((completedTasks.length / categoryTasks.length) * 100)
    },
    [allTasks],
  )

  // Handle creating new category
  const handleCreateCategory = useCallback(() => {
    if (newCategoryName.trim()) {
      const newCategory: TaskCategory = {
        id: Date.now().toString(),
        name: newCategoryName,
        color: newCategoryColor,
        description: newCategoryDescription,
        createdAt: new Date(),
        order: categories.length,
      }
      addCategory(newCategory)
      setNewCategoryName("")
      setNewCategoryDescription("")
      setNewCategoryColor("#3B82F6")
      setNewCategoryOpen(false)
    }
  }, [newCategoryName, newCategoryColor, newCategoryDescription, addCategory, categories.length])

  // Handle editing category
  const handleEditCategory = useCallback(() => {
    if (editingCategory) {
      updateCategory(editingCategory)
      setEditingCategory(null)
    }
  }, [editingCategory, updateCategory])

  // Handle task completion
  const handleCompleteTask = useCallback(
    (taskId: string) => {
      const task = allTasks.find((t) => t.id === taskId)
      if (task) {
        updateTask({ ...task, completed: true })
      }
    },
    [allTasks, updateTask],
  )

  // Handle adding new task to category
  const handleAddTaskToCategory = useCallback(
    (categoryId: string) => {
      if (newTaskDescription.trim()) {
        const newTask: Task = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          description: newTaskDescription,
          category: "clarified",
          createdAt: new Date(),
          estimatedDuration: 30,
          cognitiveLoad: 2,
          urgency: 3,
          importance: 3,
          dependencies: [],
          context: "@general",
          entropy: 0.5,
          rewardValue: 5,
          completed: false,
          categories: [categoryId],
          subtasks: [],
          allowPartialCompletion: false,
          minimumChunkSize: 15,
        }
        addTask(newTask)
        setNewTaskDescription("")
        setAddingTaskToCategory(null)
      }
    },
    [newTaskDescription, addTask],
  )

  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    setDraggedTask(task)
    e.dataTransfer.effectAllowed = "copy"
  }, [])

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "copy"
  }, [])

  // Handle drop on category
  const handleDrop = useCallback(
    (e: React.DragEvent, categoryId: string) => {
      e.preventDefault()
      if (draggedTask && !draggedTask.categories?.includes(categoryId)) {
        const updatedTask = {
          ...draggedTask,
          categories: [...(draggedTask.categories || []), categoryId],
        }
        updateTask(updatedTask)
      }
      setDraggedTask(null)
    },
    [draggedTask, updateTask],
  )

  return (
    <SidebarProvider>
      <div className="flex h-full">
        {/* Sidebar for folders */}
        <Sidebar className="border-r bg-muted/30">
          <SidebarHeader>
            <span className="font-bold text-lg">Folders</span>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={!selectedFolderId}
                  onClick={() => setSelectedFolderId(null)}
                >
                  Home
                </SidebarMenuButton>
              </SidebarMenuItem>
              {folders.map((folder) => (
                <SidebarMenuItem key={folder.id}>
                  <SidebarMenuButton
                    isActive={selectedFolderId === folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                  >
                    {folder.name}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarSeparator />
            <Button className="w-full mt-2" variant="outline" onClick={() => setShowNewFolderDialog(true)}>
              + New Folder
            </Button>
          </SidebarContent>
        </Sidebar>
        {/* Main content */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Next Actions</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" onClick={() => setShowCompletedTasks(true)}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Completed
              </Button>
              <Button variant="outline" onClick={() => setShowCategorySettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant={selectMode ? "default" : "outline"} onClick={() => {
                setSelectMode((v) => !v)
                setSelectedCategories([])
              }}>
                {selectMode ? "Cancel Select" : "Select"}
              </Button>
              <Dialog open={newCategoryOpen} onOpenChange={setNewCategoryOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <FolderPlus className="h-4 w-4" />
                    New Category
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Category</DialogTitle>
                    <DialogDescription>Create a new category to organize your tasks.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Category Name</Label>
                      <Input
                        id="category-name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="e.g., Work Projects"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-description">Description (optional)</Label>
                      <Input
                        id="category-description"
                        value={newCategoryDescription}
                        onChange={(e) => setNewCategoryDescription(e.target.value)}
                        placeholder="Brief description of this category"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-color">Color</Label>
                      <Input
                        id="category-color"
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setNewCategoryOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateCategory}>Create Category</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Selection actions */}
          {selectMode && (
            <div className="flex gap-2 items-center mb-4">
              <span className="text-sm">{selectedCategories.length} selected</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowNewFolderDialog(true)}
                disabled={selectedCategories.length === 0}
              >
                Add to New Folder
              </Button>
              {folders.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">or</span>
                  {folders.map((folder) => (
                    <Button
                      key={folder.id}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        selectedCategories.forEach((catId) => addCategoryToFolder(folder.id, catId))
                        setSelectMode(false)
                        setSelectedCategories([])
                      }}
                      disabled={selectedCategories.length === 0}
                    >
                      Add to {folder.name}
                    </Button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Category grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visibleCategories
              .filter((category) =>
                !searchTerm ||
                category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((category) => {
                const categoryTasks = getTasksForCategory(category.id)
                const completionRate = getCategoryCompletionRate(category.id)
                // Add selection checkbox if selectMode
                const isSelected = selectedCategories.includes(category.id)
                return (
                  <Card
                    key={category.id}
                    className={`overflow-hidden ${selectMode && isSelected ? "ring-2 ring-primary" : ""}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, category.id)}
                  >
                    <CardHeader className="pb-3 flex items-center gap-2">
                      {selectMode && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedCategories((prev) =>
                              isSelected
                                ? prev.filter((id) => id !== category.id)
                                : [...prev, category.id]
                            )
                          }}
                          className="mr-2"
                        />
                      )}
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setAddingTaskToCategory(category.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingCategory(category)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCategory(category.id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary">{categoryTasks.length} active tasks</Badge>
                        <Badge variant="outline">{completionRate}% complete</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {/* Quick add task input */}
                      {addingTaskToCategory === category.id && (
                        <div className="mb-4 p-3 border rounded-md bg-muted/50">
                          <div className="space-y-2">
                            <Textarea
                              placeholder="Enter task description..."
                              value={newTaskDescription}
                              onChange={(e) => setNewTaskDescription(e.target.value)}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleAddTaskToCategory(category.id)}>
                                Add Task
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setAddingTaskToCategory(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {categoryTasks.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No active tasks in this category</p>
                        ) : (
                          categoryTasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer group transition-all duration-200 task-item"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              onClick={() => setSelectedTaskId(task.id)}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{task.description}</p>
                                  <div className="flex gap-3 mt-1">
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>Urgency {task.urgency}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Star className="h-3 w-3" />
                                      <span>Importance {task.importance}</span>
                                    </div>
                                    {task.scheduledDate && (
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Calendar className="h-3 w-3" />
                                        {safeDateFormat(task.scheduledDate)}
                                      </div>
                                    )}
                                  </div>
                                  {task.categories && task.categories.length > 1 && (
                                    <div className="flex gap-1 mt-2">
                                      {task.categories
                                        .filter((id) => id !== category.id)
                                        .slice(0, 2)
                                        .map((categoryId) => {
                                          const cat = categories.find((c) => c.id === categoryId)
                                          return cat ? (
                                            <Badge key={categoryId} variant="outline" className="text-xs">
                                              {cat.name}
                                            </Badge>
                                          ) : null
                                        })}
                                      {task.categories.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{task.categories.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 focus-ring"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setSelectedTaskId(task.id)
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 focus-ring"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleCompleteTask(task.id)
                                  }}
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>

          {/* Edit Category Dialog */}
          {editingCategory && (
            <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                  <DialogDescription>Update the category details.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category-name">Category Name</Label>
                    <Input
                      id="edit-category-name"
                      value={editingCategory.name}
                      onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category-description">Description</Label>
                    <Input
                      id="edit-category-description"
                      value={editingCategory.description || ""}
                      onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-category-color">Color</Label>
                    <Input
                      id="edit-category-color"
                      type="color"
                      value={editingCategory.color}
                      onChange={(e) => setEditingCategory({ ...editingCategory, color: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingCategory(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleEditCategory}>Save Changes</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {/* Next Actions Settings Dialog */}
          <NextActionsSettingsDialog open={showCategorySettings} onClose={() => setShowCategorySettings(false)} />

          {/* Completed Tasks Dialog */}
          <CompletedTasksDialog
            open={showCompletedTasks}
            onClose={() => setShowCompletedTasks(false)}
            onTaskSelect={setSelectedTaskId}
          />

          {/* Task Detail Popup */}
          <TaskDetailPopup taskId={selectedTaskId} open={!!selectedTaskId} onClose={() => setSelectedTaskId(null)} />

          {/* New Folder Dialog */}
          <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for your new folder. The selected categories will be added to it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="e.g., Work Folders"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowNewFolderDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (newFolderName.trim() && selectedCategories.length > 0) {
                        addFolder({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          name: newFolderName,
                          createdAt: new Date(),
                          categoryIds: selectedCategories,
                        })
                        setShowNewFolderDialog(false)
                        setNewFolderName("")
                        setSelectMode(false)
                        setSelectedCategories([])
                      }
                    }}
                    disabled={!newFolderName.trim() || selectedCategories.length === 0}
                  >
                    Create Folder
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  )
}
