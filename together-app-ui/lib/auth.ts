// Destination: together-app-ui/lib/auth.ts
// REPLACE — supports the multi-step login flow, registration, refresh,
// session management, and recovery.
import { API_URL } from './api'

export interface AuthUser {
  id: string; email: string; name: string; role: string
  avatarColor: string; initials: string
  twoFactorEnabled:  boolean
  threeFactorEnabled:boolean
}
export interface AuthResult {
  user:        AuthUser
  roles:       string[]
  permissions: string[]
  accessToken: string
  refreshToken: string
  expiresIn:   number
}

export type LoginStage =
  | { stage: 'otp';  attemptId: string; expiresIn: number; devOtp?: string }
  | { stage: 'pin';  attemptId: string; expiresIn: number }
  | { stage: 'done'; result: AuthResult }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    let msg = res.statusText
    try { const b = await res.json(); msg = b.message ?? msg } catch {}
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const auth = {
  register: (input: { email: string; password: string; name: string; securityPin?: string }) =>
    call<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),

  login:    (email: string, password: string) =>
    call<LoginStage>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  verifyOtp: (attemptId: string, code: string) =>
    call<LoginStage>('/auth/login/otp', { method: 'POST', body: JSON.stringify({ attemptId, code }) }),

  verifyPin: (attemptId: string, pin: string) =>
    call<LoginStage>('/auth/login/pin', { method: 'POST', body: JSON.stringify({ attemptId, pin }) }),

  logout:   ()    => call<void>('/auth/logout', { method: 'POST' }),
  me:       ()    => call<{ user: AuthUser; roles: string[]; permissions: string[] }>('/auth/me'),
  refresh:  ()    => call<AuthResult>('/auth/refresh', { method: 'POST' }),

  // Sessions
  listSessions:    () => call<Array<{
    id: string; ip: string; userAgent: string
    createdAt: string; lastSeenAt: string; isCurrent: boolean
  }>>('/auth/sessions'),
  revokeSession:   (id: string) => call<{ ok: true }>(`/auth/sessions/${id}`, { method: 'DELETE' }),
  revokeOthers:    ()           => call<{ ok: true }>('/auth/sessions/revoke-others', { method: 'POST' }),

  // Recovery
  recoverRequest:  (email: string) =>
    call<{ ok: true; devCode?: string }>('/auth/recover/request', {
      method: 'POST', body: JSON.stringify({ email }),
    }),
  recoverReset:    (email: string, code: string, newPassword: string) =>
    call<{ ok: true }>('/auth/recover/reset', {
      method: 'POST', body: JSON.stringify({ email, code, newPassword }),
    }),
}