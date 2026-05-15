import { apiFetch } from './client'

export const getMe = () =>
  apiFetch<{ authenticated: boolean }>('/api/auth/me/')

export const login = (password: string) =>
  apiFetch<{ ok: boolean }>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })

export const logout = () =>
  apiFetch<{ ok: boolean }>('/api/auth/logout/', { method: 'POST' })
