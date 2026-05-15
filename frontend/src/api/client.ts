type Handler = () => void
let unauthorizedHandler: Handler | null = null

export function onUnauthorized(handler: Handler) {
  unauthorizedHandler = handler
}

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/)
  return match ? match[1] : ''
}

export async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
      ...options.headers,
    },
  })
  if (res.status === 401) {
    unauthorizedHandler?.()
    throw new Error('HTTP 401')
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
