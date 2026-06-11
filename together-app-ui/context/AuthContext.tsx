// Destination: together-app-ui/context/AuthContext.tsx
// REPLACE — heartbeat is now 15s, and we listen for a custom
// 'auth:unauthorized' event that lib/api.ts dispatches on any 401
// that survives the refresh attempt. That way revoked sessions get
// caught by any API call, not just the heartbeat.
'use client'
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState,
} from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { auth, AuthUser, LoginStage } from '@/lib/auth'
import { isNetworkError } from '@/lib/api'

interface AuthSnapshot {
  user:        AuthUser | null
  roles:       string[]
  permissions: string[]
}

interface AuthContextValue extends AuthSnapshot {
  loading:        boolean
  login:          (email: string, password: string) => Promise<LoginStage>
  verifyOtp:      (attemptId: string, code: string) => Promise<LoginStage>
  verifyPin:      (attemptId: string, pin: string)  => Promise<LoginStage>
  register:       (input: { email: string; password: string; name: string; securityPin?: string }) => Promise<void>
  logout:         () => Promise<void>
  hydrate:        () => Promise<void>
  hasPermission:  (perm: string) => boolean
  isAdmin:        boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
const EMPTY: AuthSnapshot = { user: null, roles: [], permissions: [] }
const PUBLIC = ['/login', '/register', '/forgot-password', '/reset-password']

export function AuthProvider({ children }: { children: ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [snap,    setSnap]    = useState<AuthSnapshot>(EMPTY)
  const [loading, setLoading] = useState(true)
  const heartbeat = useRef<number | null>(null)

  const hydrate = useCallback(async () => {
    try {
      const me = await auth.me()
      setSnap({ user: me.user, roles: me.roles, permissions: me.permissions })
    } catch {
      setSnap(EMPTY)
    }
  }, [])

  // Initial hydrate
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await auth.me()
        if (!cancelled) setSnap({ user: me.user, roles: me.roles, permissions: me.permissions })
      } catch {
        if (!cancelled) setSnap(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Global 401 listener — any API call in lib/api.ts that gets a 401
  // after a failed refresh dispatches 'auth:unauthorized'. We react by
  // clearing the snapshot and bouncing to /login. This is what catches
  // "session revoked by admin elsewhere" / "session expired by
  // inactivity" without waiting for the heartbeat.
  useEffect(() => {
    const onUnauthed = () => {
      setSnap(EMPTY)
      if (!PUBLIC.includes(pathname)) router.replace('/login')
    }
    window.addEventListener('auth:unauthorized', onUnauthed)
    return () => window.removeEventListener('auth:unauthorized', onUnauthed)
  }, [pathname, router])

  // Heartbeat — 15s, only when logged in. Catches inactivity logouts
  // even when the user is idle and not making other API calls.
  useEffect(() => {
    if (heartbeat.current) window.clearInterval(heartbeat.current)
    if (!snap.user) return
    heartbeat.current = window.setInterval(async () => {
      try { await auth.me() } catch (e) {
        if (isNetworkError(e)) return  // transient — don't log out
        setSnap(EMPTY)
        if (!PUBLIC.includes(pathname)) router.replace('/login')
      }
    }, 15_000)
    return () => { if (heartbeat.current) window.clearInterval(heartbeat.current) }
  }, [snap.user, pathname, router])

  const login     = useCallback((email: string, pw: string) => auth.login(email, pw), [])
  const verifyOtp = useCallback((id: string, code: string)  => auth.verifyOtp(id, code), [])
  const verifyPin = useCallback((id: string, pin: string)   => auth.verifyPin(id, pin), [])

  const register = useCallback(async (i: { email: string; password: string; name: string; securityPin?: string }) => {
    await auth.register(i)
  }, [])

  const logout = useCallback(async () => {
    try { await auth.logout() } catch { /* ignore */ }
    setSnap(EMPTY)
    router.replace('/login')
  }, [router])

  const hasPermission = useCallback(
    (perm: string) => snap.permissions.includes(perm),
    [snap.permissions],
  )

  return (
    <AuthContext.Provider value={{
      ...snap, loading,
      login, verifyOtp, verifyPin, register, logout, hydrate,
      hasPermission,
      isAdmin: snap.roles.includes('admin'),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}