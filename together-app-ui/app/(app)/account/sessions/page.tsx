// Destination: together-app-ui/app/(app)/account/sessions/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { auth } from '@/lib/auth'
import { parseDevice } from '@/lib/format-ua'

interface Sess {
  id: string; ip: string; userAgent: string
  createdAt: string; lastSeenAt: string; isCurrent: boolean
}

export default function SessionsPage() {
  const [items,    setItems]    = useState<Sess[]>([])
  const [err,      setErr]      = useState<string | null>(null)
  const [mutErr,   setMutErr]   = useState<string | null>(null)
  const [confirm,  setConfirm]  = useState<{ msg: string; onOk: () => void } | null>(null)

  const refresh = useCallback(async () => {
    try { setItems(await auth.listSessions()); setErr(null) }
    catch (e) { setErr((e as Error).message) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  function ask(msg: string, onOk: () => void) {
    setConfirm({ msg, onOk })
  }

  async function revoke(id: string, device: string) {
    ask(`Sign out "${device}" session?`, async () => {
      try { await auth.revokeSession(id); refresh() }
      catch (e) { setMutErr(`Could not revoke session: ${(e as Error).message}`) }
      finally { setConfirm(null) }
    })
  }

  async function revokeOthers() {
    ask('Sign out everywhere else?', async () => {
      try { await auth.revokeOthers(); refresh() }
      catch (e) { setMutErr(`Could not sign out other sessions: ${(e as Error).message}`) }
      finally { setConfirm(null) }
    })
  }

  return (
    <div className="p-8">
      {/* CR-08: styled confirm dialog replacing native confirm() */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-sm text-gray-700 mb-5">{confirm.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirm(null)}
                className="px-4 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200">
                Cancel
              </button>
              <button onClick={confirm.onOk}
                className="px-4 py-2 text-sm rounded-lg bg-cr text-white hover:opacity-90">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Your sessions</h1>
        <button onClick={revokeOthers}
          className="text-sm px-3 py-1.5 rounded bg-red-50 text-red-700 hover:bg-red-100">
          Sign out everywhere else
        </button>
      </div>
      {err    && <div role="alert" className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{err}</div>}
      {mutErr && <div role="alert" className="p-4 mb-4 rounded bg-red-50 text-red-700 text-sm">{mutErr}
        <button onClick={() => setMutErr(null)} className="ml-3 underline text-xs">Dismiss</button>
      </div>}
      <div className="space-y-3">
        {items.map(s => {
          const device = s.isCurrent ? 'This device' : parseDevice(s.userAgent)
          return (
            <div key={s.id} className={`p-5 rounded-xl border ${s.isCurrent ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
              <div className="flex items-start justify-between">
                <div>
                  {/* CR-02: meaningful device label via parseDevice */}
                  <p className="text-sm font-semibold">
                    {device}
                    {s.isCurrent && <span className="ml-2 px-2 py-0.5 rounded bg-green-200 text-xs">current</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">IP: {s.ip || 'unknown'}</p>
                  <p className="text-xs text-gray-500">Last active: {new Date(s.lastSeenAt).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1 truncate max-w-md">{s.userAgent}</p>
                </div>
                {/* AUD-08: aria-label identifies which session is being revoked */}
                {!s.isCurrent && (
                  <button
                    onClick={() => revoke(s.id, device)}
                    aria-label={`Revoke ${device} session`}
                    className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700">
                    Revoke
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {items.length === 0 && <p className="text-sm text-gray-400">No active sessions.</p>}
      </div>
    </div>
  )
}