// ─────────────────────────────────────────────────────────────────────
// Destination: components/layout/OfflineBanner.tsx
// FIXED again. Previous version used `useEffect(() => setMounted(true), [])`
// which React 19 / Next 16 flag as "Avoid calling setState directly
// within an effect".
//
// New approach: useSyncExternalStore. The server snapshot returns
// `false`, the client snapshot returns `true`. React handles the
// transition without any setState-in-effect, so the lint is happy and
// the SSR/CSR mismatch is still resolved.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useSyncExternalStore } from 'react'
import { useTasks } from '@/context/TasksContext'

// External "store" with two snapshots — that's all useSyncExternalStore
// needs. We never actually subscribe to anything that changes; we just
// want server vs client to see different values.
const subscribe         = () => () => {}
const getSnapshot       = () => true   // client
const getServerSnapshot = () => false  // server / first hydration

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useTasks()
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  // Server + first hydration both render null. After hydration commits,
  // mounted flips to true and the real banner appears (if needed).
  if (!mounted) return null
  if (isOnline && pendingCount === 0) return null

  if (!isOnline) {
    return (
      <div className="w-full px-4 py-2 flex items-center gap-2 text-xs font-medium"
        style={{ background: '#FEF3C7', color: '#92400E', borderBottom: '1px solid #FDE68A' }}>
        <span>⚠</span>
        <span>
          You&apos;re offline. Changes are being saved locally
          {pendingCount > 0 && <> — <strong>{pendingCount} pending</strong></>}
          {' '}and will sync when the connection comes back.
        </span>
      </div>
    )
  }

  return (
    <div className="w-full px-4 py-2 flex items-center gap-2 text-xs font-medium"
      style={{ background: '#DBEAFE', color: '#1E40AF', borderBottom: '1px solid #BFDBFE' }}>
      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#1E40AF' }} />
      <span>Syncing {pendingCount} change{pendingCount === 1 ? '' : 's'} to the server…</span>
    </div>
  )
}