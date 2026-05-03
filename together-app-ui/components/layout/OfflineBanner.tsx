// ─────────────────────────────────────────────────────────────────────
// Destination: components/layout/OfflineBanner.tsx
// Thin top-of-viewport strip that surfaces offline/sync state. Pulls
// from the TasksContext so it reflects both `navigator.onLine` and
// "server unreachable" (handled by useOnlineStatus + fetch failures).
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useTasks } from '@/context/TasksContext'

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useTasks()

  if (isOnline && pendingCount === 0) return null

  // Offline with queued ops → the most important state to announce
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

  // Online but still flushing the queue
  return (
    <div className="w-full px-4 py-2 flex items-center gap-2 text-xs font-medium"
      style={{ background: '#DBEAFE', color: '#1E40AF', borderBottom: '1px solid #BFDBFE' }}>
      <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: '#1E40AF' }} />
      <span>Syncing {pendingCount} change{pendingCount === 1 ? '' : 's'} to the server…</span>
    </div>
  )
}
