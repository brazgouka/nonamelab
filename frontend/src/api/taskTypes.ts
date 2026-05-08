import { apiFetch } from './client'
import type { TaskType } from '../types'

export const fetchTaskTypes = () => apiFetch<TaskType[]>('/api/task-types/')

export const createTaskType = (data: { name: string; color: string }) =>
  apiFetch<TaskType>('/api/task-types/', { method: 'POST', body: JSON.stringify(data) })

export const updateTaskType = (id: number, data: { name: string; color: string }) =>
  apiFetch<TaskType>(`/api/task-types/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteTaskType = (id: number) =>
  apiFetch<void>(`/api/task-types/${id}/`, { method: 'DELETE' })
