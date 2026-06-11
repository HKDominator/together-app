// FD-06: dual-presence state over the authenticated sockets (ADR-0002).
// In-memory and process-local by design — single-tenant per ADR-0003, same
// rationale as the task generator's run state. Presence is ephemeral: it
// rebuilds itself from live connections, so nothing is persisted.
import { Injectable } from '@nestjs/common'

type Broadcaster = (event: string, payload: unknown) => void

export interface PresenceSnapshot {
  online:  string[]
  viewing: Record<string, string> // userId → taskId currently in focus
}

// How long a user keeps their "online" status after their last socket drops.
// socket.io reconnects (network blips, page navigations, the websocket→polling
// fallback) routinely bounce a connection for a second or two — without this
// grace the partner's sidebar dot would flap offline/online on every blip.
// 5s absorbs all of those while keeping "they closed the laptop" honest.
export const PRESENCE_OFFLINE_GRACE_MS = 5_000

@Injectable()
export class PresenceService {
  private broadcast: Broadcaster = () => {}

  // userId → live socket ids. A user is online iff their set is non-empty.
  private readonly socketsByUser = new Map<string, Set<string>>()
  // socketId → userId, so disconnects can be resolved without the gateway
  // knowing whether the socket ever authenticated.
  private readonly userBySocket = new Map<string, string>()
  // userId → pending offline broadcast; cancelled if any socket reconnects
  // within the grace window.
  private readonly offlineTimers = new Map<string, NodeJS.Timeout>()
  // socketId → taskId in focus. Per-socket so a crashed tab can't leave a
  // ghost indicator (the socket's disconnect clears it), aggregated per user
  // for broadcasting. Recency = Map insertion order (entries are re-inserted
  // on every change), so the aggregate is the user's most recent focus.
  private readonly viewingBySocket = new Map<string, string>()

  /** Gateway wires this to server.emit once the socket.io server exists. */
  bind(broadcast: Broadcaster): void {
    this.broadcast = broadcast
  }

  connected(userId: string, socketId: string): void {
    // A reconnect inside the grace window means the user never read as
    // offline — cancel the pending broadcast and stay silent.
    const graceTimer = this.offlineTimers.get(userId)
    if (graceTimer) {
      clearTimeout(graceTimer)
      this.offlineTimers.delete(userId)
    }
    const wasOnline =
      graceTimer !== undefined || (this.socketsByUser.get(userId)?.size ?? 0) > 0

    let sockets = this.socketsByUser.get(userId)
    if (!sockets) { sockets = new Set(); this.socketsByUser.set(userId, sockets) }
    sockets.add(socketId)
    this.userBySocket.set(socketId, userId)

    if (!wasOnline) this.broadcast('presence:online', { userId })
  }

  disconnected(socketId: string): void {
    const userId = this.userBySocket.get(socketId)
    if (!userId) return // never authenticated, or already handled

    // Drop this socket's focus first so a closed/crashed tab can't leave a
    // ghost "looking at this" indicator on the partner's screen.
    if (this.viewingBySocket.has(socketId)) {
      const before = this.aggregateViewing(userId)
      this.viewingBySocket.delete(socketId)
      const after = this.aggregateViewing(userId)
      if (after !== before) this.broadcast('presence:viewing', { userId, taskId: after })
    }

    this.userBySocket.delete(socketId)
    const sockets = this.socketsByUser.get(userId)
    sockets?.delete(socketId)
    if (sockets && sockets.size > 0) return // still online elsewhere

    this.socketsByUser.delete(userId)
    const timer = setTimeout(() => {
      this.offlineTimers.delete(userId)
      this.broadcast('presence:offline', { userId })
    }, PRESENCE_OFFLINE_GRACE_MS)
    this.offlineTimers.set(userId, timer)
  }

  setViewing(socketId: string, userId: string, taskId: string | null): void {
    const before = this.aggregateViewing(userId)
    this.viewingBySocket.delete(socketId) // re-insert so Map order = recency
    if (taskId !== null) this.viewingBySocket.set(socketId, taskId)
    const after = this.aggregateViewing(userId)
    if (after !== before) this.broadcast('presence:viewing', { userId, taskId: after })
  }

  /** The user's most recently set focus across all their sockets, or null. */
  private aggregateViewing(userId: string): string | null {
    let latest: string | null = null
    for (const [socketId, taskId] of this.viewingBySocket) {
      if (this.userBySocket.get(socketId) === userId) latest = taskId
    }
    return latest
  }

  /**
   * Full presence state, sent to a socket right after it authenticates.
   * Presence events are not replayed on reconnect (same reality as BUG-26),
   * so a snapshot is the only trustworthy way to (re)seed a client.
   * Users inside the grace window are still online — they were never
   * announced as offline.
   */
  snapshot(): PresenceSnapshot {
    const viewing: Record<string, string> = {}
    for (const [socketId, taskId] of this.viewingBySocket) {
      const userId = this.userBySocket.get(socketId)
      if (userId) viewing[userId] = taskId // insertion order → latest wins
    }
    return {
      online: [...new Set([...this.socketsByUser.keys(), ...this.offlineTimers.keys()])],
      viewing,
    }
  }
}
