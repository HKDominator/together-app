// Destination: together-app-ui/app/(app)/admin/observation/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface Observation {
  id: string; userId: string; userEmail: string; userName: string
  reason: string; score: number; resolved: boolean
  evidence: Record<string, number> | null; flaggedAt: string
}

export default function ObservationPage() {
  const { hasPermission, loading } = useAuth()
  const [items, setItems] = useState<Observation[]>([])
  const [showAll, setShowAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/observation${showAll ? '?all=1' : ''}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems(await r.json())
    } catch (e) { setError((e as Error).message) }
  }, [showAll])

  useEffect(() => {
    if (loading) return
    if (!hasPermission('observation.view')) return
    refresh()
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [loading, hasPermission, refresh])

  async function resolve(id: string) {
    await fetch(`${API_URL}/admin/observation/${id}/resolve`, { method: 'PATCH', credentials: 'include' })
    refresh()
  }

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>
  if (!hasPermission('observation.view')) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold mb-2">Admin · Observation list</h1>
        <div className="p-6 rounded-xl bg-amber-50 text-amber-800 text-sm">
          🔒 Required permission: <code>observation.view</code>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Admin · Observation list</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
          Include resolved
        </label>
      </div>

      {error && <div className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      {items.length === 0 ? (
        <div className="p-8 rounded-xl bg-green-50 text-green-800 text-sm text-center">
          ✅ No suspicious users right now.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(o => (
            <div key={o.id} className={`p-5 rounded-xl border ${o.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-red-200'}`}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold text-gray-800">{o.userName}</div>
                  <div className="text-xs text-gray-500">{o.userEmail}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">
                    score {o.score}
                  </span>
                  {!o.resolved && (
                    <button onClick={() => resolve(o.id)}
                      className="px-3 py-1 text-xs rounded bg-gray-800 text-white hover:bg-gray-700">
                      Mark resolved
                    </button>
                  )}
                  {o.resolved && <span className="text-xs text-green-600 font-semibold">✓ Resolved</span>}
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-2">{o.reason}</p>
              {o.evidence && (
                <div className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded">
                  {JSON.stringify(o.evidence)}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2">
                Flagged {new Date(o.flaggedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}