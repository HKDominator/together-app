// BUG-26: no resync after socket reconnect — missed WS events leave the list stale.
// Fix: on 'connect' after initial connect, fetch page 1 and SET_TASKS.
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

const SYNCED_TASK: Task = {
  id: 'synced-1', title: 'Synced Task', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
}

// listTasks returns different pages on successive calls to simulate
// a task being created while disconnected.
let listTasksCall = 0
vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listTasks: () => {
      const call = listTasksCall++
      if (call === 0) return Promise.resolve({ items: [], page: 1, total: 0, totalPages: 1 })
      return Promise.resolve({ items: [SYNCED_TASK], page: 1, total: 1, totalPages: 1 })
    },
    listUsers:       () => Promise.resolve([]),
    generatorStatus: () => Promise.resolve({ running: false }),
  },
}))

function Harness() {
  const { tasks } = useTasks()
  return <span data-testid="count">{tasks.length}</span>
}

describe('socket reconnect resync (BUG-26)', () => {
  beforeEach(() => { sockHandlers = {}; listTasksCall = 0 })

  it('reconnecting the socket fetches page 1 and updates the task list', async () => {
    render(<TasksProvider><Harness /></TasksProvider>)

    // Initial hydrate: 0 tasks
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('0'))

    // Simulate initial 'connect' (must not trigger resync)
    act(() => { emitWs('connect') })
    expect(screen.getByTestId('count').textContent).toBe('0')

    // Simulate reconnect — this should trigger a page-1 fetch
    await act(async () => { emitWs('connect') })

    // After resync the task created while disconnected is now visible
    await waitFor(() => expect(screen.getByTestId('count').textContent).toBe('1'))
  })
})
