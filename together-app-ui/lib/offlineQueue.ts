// ─────────────────────────────────────────────────────────────────────
// Destination: lib/offlineQueue.ts
// Durable FIFO queue of mutations that failed while offline. Persisted
// to localStorage so a reload doesn't drop pending changes.
//
// BUG-23: old implementation stored the whole queue as a single JSON array,
// meaning every enqueue was a read-modify-write — two tabs enqueueing
// simultaneously would lose one op. Fixed by storing each op as its own
// key, so enqueue is a single atomic setItem with no shared-key collision.
// ─────────────────────────────────────────────────────────────────────
import type { TaskState, ValidatedTaskData } from '@/types'

const KEY_PREFIX = 'together_offline_op_'

export type QueuedOp =
  | { id: string; kind: 'create'; tempId: string; dto: ValidatedTaskData;       createdAt: string }
  | { id: string; kind: 'update'; taskId: string; dto: Partial<ValidatedTaskData>; createdAt: string }
  | { id: string; kind: 'delete'; taskId: string;                               createdAt: string }
  | { id: string; kind: 'state';  taskId: string; newState: TaskState;          createdAt: string }

function makeId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function opKey(opId: string): string { return `${KEY_PREFIX}${opId}` }

function readAll(): QueuedOp[] {
  if (typeof window === 'undefined') return []
  const ops: QueuedOp[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (!k?.startsWith(KEY_PREFIX)) continue
    try { ops.push(JSON.parse(window.localStorage.getItem(k)!) as QueuedOp) } catch {}
  }
  return ops.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function writeOp(op: QueuedOp): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(opKey(op.id), JSON.stringify(op))
}

export const offlineQueue = {
  enqueueCreate(tempId: string, dto: ValidatedTaskData): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'create', tempId, dto, createdAt: new Date().toISOString() }
    writeOp(op)
    return op
  },

  enqueueUpdate(taskId: string, dto: Partial<ValidatedTaskData>): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'update', taskId, dto, createdAt: new Date().toISOString() }
    writeOp(op)
    return op
  },

  enqueueDelete(taskId: string): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'delete', taskId, createdAt: new Date().toISOString() }
    writeOp(op)
    return op
  },

  enqueueStateChange(taskId: string, newState: TaskState): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'state', taskId, newState, createdAt: new Date().toISOString() }
    writeOp(op)
    return op
  },

  /** Peek at all queued ops in insertion order. */
  list(): QueuedOp[] {
    return readAll()
  },

  size(): number {
    if (typeof window === 'undefined') return 0
    let n = 0
    for (let i = 0; i < window.localStorage.length; i++) {
      if (window.localStorage.key(i)?.startsWith(KEY_PREFIX)) n++
    }
    return n
  },

  /** Remove a single op by id after successful sync. */
  remove(opId: string): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(opKey(opId))
  },

  /** Rewrite all queued ops that reference oldTempId to use the real server id.
   *  Called immediately after a queued create drains successfully so that
   *  subsequent update/delete/state ops targeting the same task don't send
   *  the temp id to the server (which would produce a 404). */
  remapTempId(oldTempId: string, newId: string): void {
    for (const op of readAll()) {
      if (op.kind === 'create') continue
      if ('taskId' in op && op.taskId === oldTempId) {
        writeOp({ ...op, taskId: newId })
      }
    }
  },

  /** Nuke everything — manual reset / testing. */
  clear(): void {
    if (typeof window === 'undefined') return
    const toRemove: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k?.startsWith(KEY_PREFIX)) toRemove.push(k)
    }
    toRemove.forEach(k => window.localStorage.removeItem(k))
  },
}
