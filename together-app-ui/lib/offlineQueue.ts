// ─────────────────────────────────────────────────────────────────────
// Destination: lib/offlineQueue.ts
// Durable FIFO queue of mutations that failed while offline. Persisted
// to localStorage so a reload doesn't drop pending changes.
//
// Silver A2 requirement:
//   "detect if the network is down or if the server is unreachable
//    and enable offline support for the CRUD operations using local
//    memory on the client device. When the connection is re-established,
//    implement data synchronization with the server"
// ─────────────────────────────────────────────────────────────────────
import type { TaskState, ValidatedTaskData } from '@/types'

const KEY = 'together_offline_queue'

export type QueuedOp =
  | { id: string; kind: 'create'; tempId: string; dto: ValidatedTaskData;       createdAt: string }
  | { id: string; kind: 'update'; taskId: string; dto: Partial<ValidatedTaskData>; createdAt: string }
  | { id: string; kind: 'delete'; taskId: string;                               createdAt: string }
  | { id: string; kind: 'state';  taskId: string; newState: TaskState;          createdAt: string }

function makeId(): string {
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function load(): QueuedOp[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as QueuedOp[]) : []
  } catch {
    return []
  }
}

function save(ops: QueuedOp[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(KEY, JSON.stringify(ops))
}

export const offlineQueue = {
  enqueueCreate(tempId: string, dto: ValidatedTaskData): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'create', tempId, dto, createdAt: new Date().toISOString() }
    save([...load(), op])
    return op
  },

  enqueueUpdate(taskId: string, dto: Partial<ValidatedTaskData>): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'update', taskId, dto, createdAt: new Date().toISOString() }
    save([...load(), op])
    return op
  },

  enqueueDelete(taskId: string): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'delete', taskId, createdAt: new Date().toISOString() }
    save([...load(), op])
    return op
  },

  enqueueStateChange(taskId: string, newState: TaskState): QueuedOp {
    const op: QueuedOp = { id: makeId(), kind: 'state', taskId, newState, createdAt: new Date().toISOString() }
    save([...load(), op])
    return op
  },

  /** Peek at all queued ops without mutating. */
  list(): QueuedOp[] {
    return load()
  },

  size(): number {
    return load().length
  },

  /** Remove a single op by id after successful sync. */
  remove(opId: string): void {
    save(load().filter(op => op.id !== opId))
  },

  /** Rewrite all queued ops that reference oldTempId to use the real server id.
   *  Called immediately after a queued create drains successfully so that
   *  subsequent update/delete/state ops targeting the same task don't send
   *  the temp id to the server (which would produce a 404). */
  remapTempId(oldTempId: string, newId: string): void {
    const updated = load().map(op => {
      if (op.kind === 'create') return op  // create ops use tempId field, not taskId
      if ('taskId' in op && op.taskId === oldTempId) return { ...op, taskId: newId }
      return op
    })
    save(updated)
  },

  /** Nuke everything — manual reset / testing. */
  clear(): void {
    if (typeof window === 'undefined') return
    window.localStorage.removeItem(KEY)
  },
}
