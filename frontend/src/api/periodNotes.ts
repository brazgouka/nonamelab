import { apiFetch } from './client'
import type { PeriodNote, PeriodTodo } from '../types'

function periodParams(year: number, month: number | null, week?: number | null): string {
  const p = new URLSearchParams({ year: String(year) })
  if (month != null) p.set('month', String(month))
  if (week != null) p.set('week', String(week))
  return p.toString()
}

export const fetchPeriodNote = (year: number, month: number | null, week?: number | null) =>
  apiFetch<PeriodNote>(`/api/period-notes/for-period/?${periodParams(year, month, week)}`)

export const savePeriodNote = (year: number, month: number | null, content: string, week?: number | null) =>
  apiFetch<PeriodNote>(`/api/period-notes/for-period/?${periodParams(year, month, week)}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })

export const fetchPeriodTodos = (year: number, month: number | null) =>
  apiFetch<PeriodTodo[]>(`/api/period-todos/?${periodParams(year, month)}`)

export const createPeriodTodo = (year: number, month: number | null, title: string) =>
  apiFetch<PeriodTodo>('/api/period-todos/', {
    method: 'POST',
    body: JSON.stringify({ year, month, title }),
  })

export const togglePeriodTodo = (id: number) =>
  apiFetch<PeriodTodo>(`/api/period-todos/${id}/toggle/`, { method: 'POST' })

export const deletePeriodTodo = (id: number) =>
  apiFetch<void>(`/api/period-todos/${id}/`, { method: 'DELETE' })
