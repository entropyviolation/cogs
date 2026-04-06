import { type Task, TaskType, type WeeklyData } from "./weekly-task-types"
import { formatDateKey } from "./weekly-date-utils"

export const calculateTaskPercentage = (
  taskId: string,
  tasks: Task[],
  weeklyData: WeeklyData,
  weekDates: Date[],
): number => {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return 0

  // Convert dates to string keys
  const dateKeys = weekDates.map((date) => formatDateKey(date))

  switch (task.type) {
    case TaskType.BOOLEAN:
    case TaskType.TEXT: {
      // For boolean/text: % = (days completed / 7) * 100
      let daysCompleted = 0

      dateKeys.forEach((dateKey) => {
        const completion = weeklyData[dateKey]?.[taskId]
        if (task.type === TaskType.BOOLEAN && completion?.completed) {
          daysCompleted++
        } else if (task.type === TaskType.TEXT && completion?.text) {
          daysCompleted++
        }
      })

      return (daysCompleted / 7) * 100
    }

    case TaskType.TIME:
    case TaskType.COUNT: {
      // For time/count: % = (total completed / (goal * 7)) * 100, capped at 100%
      if (!task.goal) return 0

      let totalCompleted = 0
      const totalGoal = task.goal * 7

      dateKeys.forEach((dateKey) => {
        const completion = weeklyData[dateKey]?.[taskId]
        if (completion?.value !== undefined) {
          totalCompleted += completion.value
        }
      })

      const percentage = (totalCompleted / totalGoal) * 100
      return Math.min(100, percentage)
    }

    case TaskType.INCREMENTAL: {
      if (!task.incrementalData) return 0

      const keys = Object.keys(task.incrementalData.currentValues)
      if (keys.length === 0) return 0

      let totalPercentage = 0

      keys.forEach((key) => {
        let daysCompleted = 0

        dateKeys.forEach((dateKey, dayIndex) => {
          const completion = weeklyData[dateKey]?.[taskId]
          if (!completion?.incrementalValues?.[key]) return

          const value = completion.incrementalValues[key]
          const baseValue = task.incrementalData?.currentValues[key] || 0
          const increment = task.incrementalData?.weeklyIncrement[key] || 0
          const targetGoal = baseValue + increment * dayIndex

          if (value >= targetGoal) {
            daysCompleted++
          }
        })

        totalPercentage += (daysCompleted / 7) * 100
      })

      return totalPercentage / keys.length
    }

    default:
      return 0
  }
}

export const calculateDayPercentageAV = (
  dateKey: string,
  tasks: Task[],
  weeklyData: WeeklyData,
  dayIndex: number,
): number => {
  const numTasks = tasks.length

  if (!weeklyData[dateKey]) {
    return 0
  }

  let totalTaskPercentage = 0
  let tasksWithData = 0

  tasks.forEach((task) => {
    const completion = weeklyData[dateKey]?.[task.id]
    if (!completion) {
      return
    }

    let taskPercentage = 0

    switch (task.type) {
      case TaskType.BOOLEAN:
        if (completion.completed) {
          taskPercentage = 100
          tasksWithData++
        }
        break

      case TaskType.TIME:
      case TaskType.COUNT:
        if (completion.value !== undefined && task.goal) {
          taskPercentage = Math.min(100, (completion.value / task.goal) * 100)
          tasksWithData++
        }
        break

      case TaskType.TEXT:
        if (completion.text) {
          taskPercentage = 100
          tasksWithData++
        }
        break

      case TaskType.INCREMENTAL:
        if (task.incrementalData && completion.incrementalValues) {
          const keys = Object.keys(task.incrementalData.currentValues)
          let keyPercentages = 0
          let keysWithData = 0

          keys.forEach((key) => {
            const value = completion.incrementalValues?.[key]
            if (value !== undefined) {
              const baseValue = task.incrementalData?.currentValues[key] || 0
              const increment = task.incrementalData?.weeklyIncrement[key] || 0
              const targetGoal = baseValue + increment * dayIndex

              if (targetGoal > 0) {
                const keyPercentage = value >= targetGoal ? 100 : (value / targetGoal) * 100
                keyPercentages += keyPercentage
                keysWithData++
              }
            }
          })

          if (keysWithData > 0) {
            taskPercentage = keyPercentages / keysWithData
            tasksWithData++
          }
        }
        break
    }

    totalTaskPercentage += taskPercentage
  })

  const finalPercentage = tasksWithData > 0 ? totalTaskPercentage / numTasks : 0
  return finalPercentage
}
