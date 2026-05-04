// Destination: together-app-ui/context/AuthContext.tsx
// NEW. Holds the current user + their permissions. Hydrates on mount
// via /auth/me — so a page refresh keeps the session alive as long as
// the cookie is still valid.
'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { auth, AuthResult } from '@/lib/auth'

interface AuthContextValue {
  user:        AuthResult['user']  | null
  roles:       string[]
  permissions: string[]
  loading:     boolean
  login:       (email: string, password: string) => Promise<void>
  logout:      () => Promise<void>
  hasPermission: (perm: string) => boolean
  isAdmin:     boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [data,    setData]    = useState<AuthResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    auth.me().then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await auth.login(email, password)
    setData(r)
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setData(null)
  }, [])

  const hasPermission = useCallback(
    (perm: string) => data?.permissions.includes(perm) ?? false,
    [data],
  )

  return (
    <AuthContext.Provider value={{
      user:        data?.user        ?? null,
      roles:       data?.roles       ?? [],
      permissions: data?.permissions ?? [],
      loading, login, logout, hasPermission,
      isAdmin: data?.roles.includes('admin') ?? false,
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