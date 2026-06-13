// BUG-25: WS task:created arriving before API response creates a duplicate row.
// Race: createTask() is in flight (API pending) → WS fires task:created → API resolves → REPLACE_ID
// Without the dedup fix, REPLACE_ID replaces tId with real-id while WS already inserted real-id,
// leaving two entries with the same id.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { TasksProvider, useTasks } from '@/context/TasksContext'
import type { Task } from '@/types'

// ── socket mock ────────────────────────────────────────────────────────
let sockHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
const mockSocket = {
  on:  (ev: string, cb: (...args: unknown[]) => void) => { (sockHandlers[ev] ??= []).push(cb) },
  off: (ev: string, cb: (...args: unknown[]) => void) => {
    sockHandlers[ev] = (sockHandlers[ev] ?? []).filter(h => h !== cb)
  },
}
const emitWs = (ev: string, ...args: unknown[]) => (sockHandlers[ev] ?? []).forEach(h => h(...args))

vi.mock('@/lib/ws',               () => ({ getSocket: () => mockSocket }))
vi.mock('@/context/AuthContext',   () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => ({ isOnline: true }) }))

const REAL_TASK: Task = {
  id: 'real-1', title: 'T', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
}

let resolveCreate: (t: Task) => void = () => {}

vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listTasks:       () => Promise.resolve({ items: [], page: 1, total: 0, totalPages: 1 }),
    listUsers:       () => Promise.resolve([]),
    generatorStatus: () => Promise.resolve({ running: false }),
    createTask:      () => new Promise<Task>(res => { resolveCreate = res }),
    deleteTask:      () => Promise.resolve(),
  },
}))

function Harness() {
  const { tasks, createTask } = useTasks()
  return (
    <>
      <span data-testid="count">{tasks.length}</span>
      <button data-testid="create"
        onClick={() => createTask({ title: 'T', priority: 'medium', assigneeId: 'u1' })}>
        Create
      </button>
    </>
  )
}

describe('optimistic create WS echo race (BUG-25)', () => {
  beforeEach(() => { sockHandlers = {} })

  it('WS echo before API response does not leave a duplicate row after REPLACE_ID', async () => {
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))

    // createTask() — API promise is pending (resolveCreate not yet called).
    // Optimistic row with tempId is inserted.
    act(() => { screen.getByTestId('create').click() })
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))

    // WS echo arrives BEFORE the API resolves: UPSERT inserts real-1 (tempId still present).
    act(() => { emitWs('task:created', REAL_TASK) })

    // Without fix: count is now 2 (tempId + real-1).
    // With fix: REPLACE_ID will deduplicate — wait for API to resolve first.

    // API resolves → REPLACE_ID(oldId=tempId, task=real-1).
    await act(async () => { resolveCreate(REAL_TASK) })

    // Must be exactly 1 task regardless of WS arrival timing.
    expect(screen.getByTestId('count').textContent).toBe('1')
  })
})
