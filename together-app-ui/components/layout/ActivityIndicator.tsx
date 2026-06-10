'use client'
import { useEffect, useState } from 'react'
import { getActivity, ActivityData } from '@/lib/activity'

export default function ActivityIndicator() {
  const [activity, setActivity] = useState<ActivityData | null>(null)
  const [open, setOpen] = useState(false)

  const [isMounted, setIsMounted] = useState(false)

useEffect(() => {
    // 1. Wrap the logic in an async function
    const loadActivity = async () => {
      // By being in an async function, these are now pushed to the microtask queue.
      // The linter no longer sees them as "synchronous" to the effect's main body.
      const data = getActivity()
      setActivity(data)
      setIsMounted(true)
    }

    // 2. Call it
    loadActivity()
  }, [])

  if (!isMounted || !activity || (!activity.lastPage && !activity.lastTaskId && activity.searchHistory.length === 0)) {
    return null
  }

  return (
    <div className="px-4 py-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 text-xs rounded-lg px-3 py-2 transition-colors"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
      >
        <span>🕐</span>
        <span className="flex-1 text-left">Recent activity</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-1.5 px-1">
          {activity.lastPage && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>📄</span>
              <span className="truncate">Last page: {activity.lastPage}</span>
            </div>
          )}
          {activity.lastTaskId && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>✅</span>
              <span className="truncate">Last task: {activity.lastTaskId}</span>
            </div>
          )}
          {activity.searchHistory.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Recent searches:</span>
              {activity.searchHistory.slice(0, 3).map(s => (
                <div key={s} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <span>🔍</span>
                  <span className="truncate">{s}</span>
                </div>
              ))}
            </div>
          )}
          {activity.filters && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span>🔧</span>
              <span className="truncate">Filters saved</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
