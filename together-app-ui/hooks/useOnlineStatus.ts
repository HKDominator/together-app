// ─────────────────────────────────────────────────────────────────────
// Destination: hooks/useOnlineStatus.ts
// FIXED:
//   1. ping() now sends `credentials: 'include'` so CORS-with-credentials
//      doesn't reject it.
//   2. Any HTTP response (even 4xx/5xx) means the server IS reachable
//      → we're online. Only a fetch *throw* (network error) flips to
//      offline. Previously a 401 was treated as offline.
//   3. Initial state is `true` (assume online). The first ping runs
//      after a tiny delay so the backend has time to be reachable
//      after page load.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState, useCallback } from 'react'
import { API_URL } from '@/lib/api'

const PING_INTERVAL_MS = 15_000  // 15s — balance freshness vs noise

export function useOnlineStatus() {
  const initiallyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  const [isOnline, setIsOnline] = useState<boolean>(initiallyOnline)

  const ping = useCallback(async () => {
    // navigator.onLine is the cheapest signal — if the browser already
    // knows we're disconnected, no point trying the network.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false)
      return
    }
    try {
      // Any HTTP response = server is reachable. Don't filter on res.ok
      // because a 401 still proves the server is up.
      await fetch(`${API_URL}/tasks?perPage=1`, {
        method:      'GET',
        credentials: 'include',
      })
      setIsOnline(true)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
    const onOnline  = () => { setIsOnline(true);  ping() }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Defer first ping slightly — gives the backend a moment to be
    // reachable after a fresh page load and avoids a false "offline"
    // flash on slow startups.
    const initialPing = window.setTimeout(() => { void ping() }, 250)

    const interval = window.setInterval(ping, PING_INTERVAL_MS)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      window.clearTimeout(initialPing)
      window.clearInterval(interval)
    }
  }, [ping])

  return { isOnline, recheck: ping }
}