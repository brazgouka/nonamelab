import { apiFetch } from './client'
import type { Note } from '../types'

export const fetchNotes = () => apiFetch<Note[]>('/api/notes/')
export const createNote = () => apiFetch<Note>('/api/notes/', { method: 'POST', body: JSON.stringify({ title: '', content: '' }) })
export const updateNote = (id: number, data: Partial<Note>) =>
  apiFetch<Note>(`/api/notes/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
export const deleteNote = (id: number) => apiFetch<void>(`/api/notes/${id}/`, { method: 'DELETE' })
