// Destination: together-app-ui/lib/auth.ts
// NEW. Auth-flavoured API surface. credentials:'include' is critical —
// without it the session cookie won't be sent or accepted.
import { API_URL } from './api'

export interface AuthUser {
  id: string; email: string; name: string; role: string
  avatarColor: string; initials: string
}

export interface AuthResult {
  user:        AuthUser
  roles:       string[]
  permissions: string[]
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    let msg = res.statusText
    try { const b = await res.json(); msg = b.message ?? msg } catch {}
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const auth = {
  login:  (email: string, password: string) =>
    call<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => call<void>('/auth/logout', { method: 'POST' }),
  me:     () => call<AuthResult>('/auth/me'),
}