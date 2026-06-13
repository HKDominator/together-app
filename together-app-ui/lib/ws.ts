// ─────────────────────────────────────────────────────────────────────
// Destination: lib/ws.ts
// socket.io-client singleton for receiving task:* events from the
// backend's TasksGateway.
//
// Install dep (frontend): npm i socket.io-client
// ─────────────────────────────────────────────────────────────────────
import { io, Socket } from 'socket.io-client'
import type { Task } from '@/types'
import { refreshOnce } from './api'

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'

// ── Server → client event payloads ───────────────────────────────────
export interface ServerEvents {
  'task:created':       (task: Task)            => void
  'task:updated':       (task: Task)            => void
  'task:deleted':       (payload: { id: string }) => void
  'generator:started':  ()                      => void
  'generator:stopped':  ()                      => void
}

// ── Auth-reconnect ───────────────────────────────────────────────────
// The handshake is only authenticated at connect time (SEC-04). A reconnect
// with an expired access cookie gets rejected server-side, which socket.io
// reports as 'io server disconnect' — a reason it never auto-retries. Refresh
// the session and reconnect manually.
const MAX_AUTH_RECONNECT_ATTEMPTS = 3

export function attachAuthReconnect(sock: Socket): void {
  // Caps consecutive refresh→reconnect attempts so a server that keeps
  // rejecting us (misconfig, revoked mid-handshake) can't cause a hot loop.
  let attempts = 0
  sock.on('connect', () => { attempts = 0 })
  sock.on('disconnect', (reason: string) => {
    // Every other reason (transport close, ping timeout, …) is retried by
    // socket.io itself; only a server rejection needs the refresh dance.
    if (reason !== 'io server disconnect') return
    if (attempts >= MAX_AUTH_RECONNECT_ATTEMPTS) return
    attempts++
    void refreshOnce().then(ok => {
      // Refresh failed → the session is dead; AuthContext's heartbeat / the
      // next API 401 handles the logout. Reconnecting would just be rejected.
      if (ok) sock.connect()
    })
  })
}

// ── Singleton ────────────────────────────────────────────────────────
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect:  true,
      transports:   ['websocket', 'polling'],
      reconnection: true,
      // The handshake is authenticated via the access cookie (SEC-04); the
      // polling fallback is a cross-origin XHR that drops cookies without this.
      withCredentials: true,
    })
    attachAuthReconnect(socket)
  }
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
