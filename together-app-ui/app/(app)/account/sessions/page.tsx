// Destination: together-app-ui/app/(app)/account/sessions/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { auth } from '@/lib/auth'

interface Sess {
  id: string; ip: string; userAgent: string
  createdAt: string; lastSeenAt: string; isCurrent: boolean
}

export default function SessionsPage() {
  const [items, setItems] = useState<Sess[]>([])
  const [err,   setErr]   = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try { setItems(await auth.listSessions()) }
    catch (e) { setErr((e as Error).message) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  async function revoke(id: string) {
    if (!confirm('Sign this session out?')) return
    await auth.revokeSession(id)
    refresh()
  }
  async function revokeOthers() {
    if (!confirm('Sign out everywhere else?')) return
    await auth.revokeOthers()
    refresh()
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Your sessions</h1>
        <button onClick={revokeOthers}
          className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100">
          Sign out everywhere else
        </button>
      </div>
      {err && <div className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      <div className="space-y-3">
        {items.map(s => (
          <div key={s.id} className={`p-5 rounded-xl border ${s.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {s.isCurrent ? 'This device' : (s.userAgent.split(' ')[0] || 'Device')}
                  {s.isCurrent && <span className="ml-2 px-2 py-0.5 rounded bg-green-200 text-xs">current</span>}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">IP: {s.ip || 'unknown'}</p>
                <p className="text-xs text-gray-500">Last active: {new Date(s.lastSeenAt).toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{s.userAgent}</p>
              </div>
              {!s.isCurrent && (
                <button onClick={() => revoke(s.id)}
                  className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-gray-400">No active sessions.</p>}
      </div>
    </div>
  )
}