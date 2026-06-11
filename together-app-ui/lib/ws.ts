// ─────────────────────────────────────────────────────────────────────
// Destination: lib/ws.ts
// socket.io-client singleton for receiving task:* events from the
// backend's TasksGateway.
//
// Install dep (frontend): npm i socket.io-client
// ─────────────────────────────────────────────────────────────────────
import { io, Socket } from 'socket.io-client'
import type { Task } from '@/types'

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3001'

// ── Server → client event payloads ───────────────────────────────────
export interface ServerEvents {
  'task:created':       (task: Task)            => void
  'task:updated':       (task: Task)            => void
  'task:deleted':       (payload: { id: string }) => void
  'generator:started':  ()                      => void
  'generator:stopped':  ()                      => void
}

// ── Singleton ────────────────────────────────────────────────────────
let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(WS_URL, {
      autoConnect:  true,
      transports:   ['websocket', 'polling'],
      reconnection: true,
    })
  }
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
