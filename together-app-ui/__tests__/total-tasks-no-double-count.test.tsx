// BUG-24: totalTasks double-counts own mutations (optimistic increment + WS echo increment).
// Fix: track real ids of creates/deletes initiated by this tab and skip the WS-echo adjustment.
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
const REAL_TASK_2: Task = { ...REAL_TASK, id: 'real-2' }

vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listTasks:       () => Promise.resolve({ items: [], page: 1, total: 0, totalPages: 1 }),
    listUsers:       () => Promise.resolve([]),
    generatorStatus: () => Promise.resolve({ running: false }),
    createTask:      () => Promise.resolve(REAL_TASK),
    deleteTask:      () => Promise.resolve(),
  },
}))

function Harness() {
  const { totalTasks, createTask, deleteTask, tasks } = useTasks()
  return (
    <>
      <span data-testid="total">{totalTasks}</span>
      <button data-testid="create"
        onClick={() => createTask({ title: 'T', priority: 'medium', assigneeId: 'u1' })}>
        Create
      </button>
      {tasks.map(t => (
        <button key={t.id} data-testid={`delete-${t.id}`} onClick={() => deleteTask(t.id)}>
          Delete {t.id}
        </button>
      ))}
    </>
  )
}

describe('totalTasks double-count guard (BUG-24)', () => {
  beforeEach(() => { sockHandlers = {} })

  it('own create + WS echo keeps totalTasks at 1, not 2', async () => {
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('0'))

    // createTask() does optimistic +1, then api resolves → REPLACE_ID
    await act(async () => { screen.getByTestId('create').click() })
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('1'))

    // Server now echoes back task:created — must NOT add another +1
    act(() => { emitWs('task:created', REAL_TASK) })

    expect(screen.getByTestId('total').textContent).toBe('1')
  })

  it('own delete + WS echo keeps totalTasks at 1, not 0', async () => {
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('0'))

    // Seed 2 tasks via WS (from "other user") so count = 2
    act(() => { emitWs('task:created', REAL_TASK) })
    act(() => { emitWs('task:created', REAL_TASK_2) })
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('2'))

    // Delete one: optimistic -1 → 1
    await act(async () => { screen.getByTestId('delete-real-1').click() })
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('1'))

    // Server echoes task:deleted — must NOT subtract another -1
    act(() => { emitWs('task:deleted', { id: 'real-1' }) })

    expect(screen.getByTestId('total').textContent).toBe('1')
  })
})
