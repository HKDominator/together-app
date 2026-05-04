// Destination: together-app-ui/app/(app)/admin/logs/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import { API_URL } from '@/lib/api'

interface ActionLog {
  id: string; userId: string | null; userRole: string
  action: string; method: string; path: string
  statusCode: number; durationMs: number
  ip: string; createdAt: string
}

export default function LogsPage() {
  const { hasPermission, loading } = useAuth()
  const [page,  setPage]  = useState(1)
  const [data,  setData]  = useState<{ items: ActionLog[]; total: number; totalPages: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/admin/logs?page=${page}&perPage=50`, { credentials: 'include' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
    } catch (e) { setError((e as Error).message) }
  }, [page])

  useEffect(() => {
    if (loading || !hasPermission('log.view')) return
    fetchPage()
  }, [loading, hasPermission, fetchPage])

  if (loading) return <div className="p-8 text-gray-500">Loading…</div>
  if (!hasPermission('log.view')) {
    return (
      <div className="p-8">
        <h1 className="font-display text-2xl font-bold mb-2">Admin · Action logs</h1>
        <div className="p-6 rounded-xl bg-amber-50 text-amber-800 text-sm">
          🔒 Required permission: <code>log.view</code>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="font-display text-2xl font-bold mb-6">Admin · Action logs</h1>
      {error && <div className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-left text-gray-500 uppercase">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2 text-right">Status</th>
              <th className="px-3 py-2 text-right">ms</th>
              <th className="px-3 py-2">IP</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map(l => (
              <tr key={l.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-500">{new Date(l.createdAt).toLocaleTimeString()}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-gray-600">{l.userId?.slice(0, 8) ?? '—'}</td>
                <td className="px-3 py-2">{l.userRole || <span className="text-gray-400">anon</span>}</td>
                <td className="px-3 py-2 font-mono">{l.method}</td>
                <td className="px-3 py-2 font-mono text-gray-700">{l.path}</td>
                <td className={`px-3 py-2 text-right font-bold ${
                  l.statusCode >= 500 ? 'text-red-700' : l.statusCode >= 400 ? 'text-amber-600' : 'text-green-700'
                }`}>{l.statusCode}</td>
                <td className="px-3 py-2 text-right text-gray-500">{l.durationMs}</td>
                <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{l.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>{data.total} total entries</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-3 py-1 rounded border disabled:opacity-50">← Prev</button>
            <span className="px-3 py-1">{page} / {data.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages}
              className="px-3 py-1 rounded border disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  )
}