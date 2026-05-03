// ─────────────────────────────────────────────────────────────────────
// Destination: hooks/useOnlineStatus.ts
// Tracks online/offline status with two signals:
//   1. navigator.onLine + 'online'/'offline' window events (cheap, instant)
//   2. Periodic health-check ping via fetch (catches "internet works
//      but backend is down" — navigator.onLine can't tell you that).
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useEffect, useState, useCallback } from 'react'
import { API_URL } from '@/lib/api'

const PING_INTERVAL_MS = 15_000  // 15s — balance freshness vs noise

export function useOnlineStatus() {
  const initiallyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
  const [isOnline, setIsOnline] = useState<boolean>(initiallyOnline)

  const ping = useCallback(async () => {
    try {
      // HEAD would be nicer but the NestJS controllers don't register
      // HEAD verbs; a cheap GET /tasks?perPage=1 works as a heartbeat.
      const res = await fetch(`${API_URL}/tasks?perPage=1`, { method: 'GET' })
      setIsOnline(res.ok)
    } catch {
      setIsOnline(false)
    }
  }, [])

  useEffect(() => {
     const deferredPing = () => queueMicrotask(() => { void ping() })
    const onOnline  = () => { setIsOnline(true);  ping() }
    const onOffline = () => setIsOnline(false)

    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)

    // Verify once on mount — the browser might say "online" while
    // the backend is actually down.
    deferredPing()

    const interval = setInterval(ping, PING_INTERVAL_MS)
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
      clearInterval(interval)
    }
  }, [ping])

  return { isOnline, recheck: ping }
}
