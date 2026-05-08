export interface TaskType {
  id: number
  name: string
  color: string
}

export interface Task {
  id: number
  title: string
  description: string
  date: string
  time: string | null
  priority: 'low' | 'medium' | 'high' | null
  completed: boolean
  task_type: number | null
  task_type_detail: TaskType | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly'
  recurrence_days: number[] | null
  recurrence_end_date: string | null
  series_id: string | null
  created_at: string
  updated_at: string
}

export type DeleteScope = 'instance' | 'future' | 'all'

export interface PeriodNote {
  id: number
  year: number
  month: number | null
  content: string
  updated_at: string
}

export interface PeriodTodo {
  id: number
  year: number
  month: number | null
  title: string
  completed: boolean
  order: number
  created_at: string
}
