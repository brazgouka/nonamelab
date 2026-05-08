import { apiFetch } from './client'
import type { Task, DeleteScope } from '../types'

export const fetchTasks = (start: string, end: string) =>
  apiFetch<Task[]>(`/api/tasks/?start=${start}&end=${end}`)

export const createTask = (data: Partial<Task>) =>
  apiFetch<Task>('/api/tasks/', { method: 'POST', body: JSON.stringify(data) })

export const updateTask = (id: number, data: Partial<Task>) =>
  apiFetch<Task>(`/api/tasks/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })

export const deleteTask = (id: number, scope: DeleteScope) =>
  apiFetch<void>(`/api/tasks/${id}/?scope=${scope}`, { method: 'DELETE' })

export const toggleTask = (id: number) =>
  apiFetch<Task>(`/api/tasks/${id}/toggle/`, { method: 'POST' })
