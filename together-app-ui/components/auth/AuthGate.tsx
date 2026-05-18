// Destination: together-app-ui/components/auth/AuthGate.tsx
// NEW. Wraps the protected app shell. Three states:
//   - loading: show a tiny "Loading…" placeholder
//   - not authed: redirect to /login (replace, no history entry)
//   - authed: render children
//
// Used in (app)/layout.tsx so every page under /(app) is protected
// automatically without each page needing its own check.
'use client'
import { ReactNode, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading…
      </div>
    )
  }
  if (!user) return null   // redirect in-flight, render nothing
  return <>{children}</>
}