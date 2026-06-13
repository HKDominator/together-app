// Destination: together-app-ui/app/(app)/admin/observation/page.tsx
// REPLACE — surfaces AI verdicts (signal, rationale, model name) on
// top of the existing heuristic evidence. Evidence type widened from
// Record<string, number> to Record<string, unknown> so mixed heuristic
// + AI payloads render.
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface Observation {
  id: string; userId: string; userEmail: string; userName: string
  reason: string; score: number; resolved: boolean
  evidence: Record<string, unknown> | null; flaggedAt: string
}

function aiSummary(ev: Record<string, unknown> | null) {
  if (!ev) return null
  if (typeof ev.aiSignal !== 'string') return null
  return {
    signal:    ev.aiSignal as string,
    score:     typeof ev.aiScore     === 'number' ? ev.aiScore     : null,
    rationale: typeof ev.aiRationale === 'string' ? ev.aiRationale : null,
    model:     typeof ev.aiModel     === 'string' ? ev.aiModel     : null,
  }
}

function signalColor(signal: string): string {
  switch (signal) {
    case 'scraper': return 'bg-blue-100 text-blue-800'
    case 'vandal':  return 'bg-red-100 text-red-800'
    case 'probe':   return 'bg-amber-100 text-amber-800'
    case 'burst':   return 'bg-purple-100 text-purple-800'
    case 'normal':  return 'bg-gray-100 text-gray-700'
    default:        return 'bg-gray-100 text-gray-700'
  }
}

export default function ObservationPage() {
  const { hasPermission, loading } = useAuth()
  const [items,     setItems]   = useState<Observation[]>([])
  const [showAll,   setShowAll] = useState(false)
  const [error,     setError]   = useState<string | null>(null)
  const [resolveErr,setResolveErr] = useState<string | null>(null)
  const [paused,    setPaused]  = useState(false)   // CR-10: pause auto-poll

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/observation${showAll ? '?all=1' : ''}`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setItems(await r.json()); setError(null)
    } catch (e) { setError((e as Error).message) }
  }, [showAll])

  // CR-10: respect the paused flag; add a manual refresh button below
  useEffect(() => {
    if (loading || !hasPermission('observation.view')) return
    refresh()
    if (paused) return
    const t = setInterval(refresh, 5000)
    return () => clearInterval(t)
  }, [loading, hasPermission, refresh, paused])

  // CR-09: surface errors from resolve() instead of swallowing them
  async function resolve(id: string) {
    try {
      const r = await fetch(`${API_URL}/admin/observation/${id}/resolve`, { method: 'PATCH', credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setResolveErr(null)
      refresh()
    } catch (e) { setResolveErr(`Could not resolve observation: ${(e as Error).message}`) }
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
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} />
            Include resolved
          </label>
          {/* CR-10: manual refresh + pause toggle for the 5s auto-poll */}
          <button onClick={refresh}
            className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">
            Refresh
          </button>
          <button onClick={() => setPaused(p => !p)}
            aria-label={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
            className={`text-xs px-3 py-1.5 rounded ${paused ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'}`}>
            {paused ? 'Auto-refresh paused' : 'Pause'}
          </button>
        </div>
      </div>

      {error      && <div role="alert" className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{error}</div>}
      {resolveErr && <div role="alert" className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{resolveErr}
        <button onClick={() => setResolveErr(null)} className="ml-3 underline text-xs">Dismiss</button>
      </div>}

      {items.length === 0 ? (
        <div className="p-8 rounded-xl bg-green-50 text-green-800 text-sm text-center">
          ✅ No suspicious users right now.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(o => {
            const ai = aiSummary(o.evidence)
            return (
              <div
                key={o.id}
                className={`p-5 rounded-xl border ${o.resolved ? 'bg-gray-50 border-gray-200' : 'bg-white border-red-200'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-gray-800">{o.userName}</div>
                    <div className="text-xs text-gray-500">{o.userEmail}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {ai && (
                      <span className={`px-2 py-1 rounded text-xs font-bold ${signalColor(ai.signal)}`}>
                        AI · {ai.signal}{ai.score !== null && ` (${ai.score})`}
                      </span>
                    )}
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

                {ai?.rationale && (
                  <div className="text-xs italic text-gray-600 mb-2">
                    “{ai.rationale}”
                    {ai.model && <span className="text-xs text-gray-400 ml-2">— {ai.model}</span>}
                  </div>
                )}

                {o.evidence && (
                  <details className="text-xs text-gray-500">
                    <summary className="cursor-pointer hover:text-gray-700">Raw evidence</summary>
                    <pre className="mt-1 font-mono bg-gray-50 px-3 py-2 rounded overflow-x-auto">
                      {JSON.stringify(o.evidence, null, 2)}
                    </pre>
                  </details>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  Flagged {new Date(o.flaggedAt).toLocaleString()}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}