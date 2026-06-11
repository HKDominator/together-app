// Step 5: TasksContext.lastCompletion is set when a server task:updated echo
// transitions not-done → done AND the partner is currently online.
// Keyed off the server echo, never optimistic state, so a rollback never flashes.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { TasksProvider, useTasks } from '@/context/TasksContext'
import type { Task, User } from '@/types'

// ── socket mock ────────────────────────────────────────────────────────
let sockHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
const mockSocket = {
  on:  (ev: string, cb: (...args: unknown[]) => void) => { (sockHandlers[ev] ??= []).push(cb) },
  off: (ev: string, cb: (...args: unknown[]) => void) => {
    sockHandlers[ev] = (sockHandlers[ev] ?? []).filter(h => h !== cb)
  },
  emit: vi.fn(),
}
const emitWs = (ev: string, ...args: unknown[]) => (sockHandlers[ev] ?? []).forEach(h => h(...args))

// ── presence mock — onlineUserIds controlled per test ─────────────────
let mockOnlineUserIds = new Set<string>()
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({ onlineUserIds: mockOnlineUserIds, viewingByUser: {}, setViewingTask: vi.fn() }),
}))

vi.mock('@/lib/ws',               () => ({ getSocket: () => mockSocket }))
vi.mock('@/context/AuthContext',   () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/hooks/useOnlineStatus', () => ({ useOnlineStatus: () => ({ isOnline: true }) }))

// ── fixtures ──────────────────────────────────────────────────────────
const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const IN_PROGRESS_TASK: Task = {
  id: 't1', title: 'Task A', description: '', state: 'in_progress', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
}
const DONE_TASK: Task = { ...IN_PROGRESS_TASK, state: 'done' }

// Mutable: lets each test control the initial task state returned by listTasks.
let initialTasks: Task[] = [IN_PROGRESS_TASK]

vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listTasks:       () => Promise.resolve({ items: initialTasks, page: 1, total: initialTasks.length, totalPages: 1 }),
    listUsers:       () => Promise.resolve([SELF, PARTNER]),
    generatorStatus: () => Promise.resolve({ running: false }),
  },
}))

function Harness() {
  const { lastCompletion, tasks } = useTasks()
  return (
    <>
      <span data-testid="lc">{JSON.stringify(lastCompletion)}</span>
      <span data-testid="tc">{tasks.length}</span>
    </>
  )
}

describe('TasksContext.lastCompletion — completion flash (Step 5)', () => {
  beforeEach(() => {
    sockHandlers = {}
    mockOnlineUserIds = new Set()
    initialTasks = [IN_PROGRESS_TASK]
  })

  it('is null initially', async () => {
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('lc').textContent).toBe('null'))
  })

  it('sets lastCompletion when not-done→done arrives and partner is online', async () => {
    mockOnlineUserIds = new Set(['u2'])
    render(<TasksProvider><Harness /></TasksProvider>)
    // Wait for initial hydrate so tasksRef has the in_progress task
    await waitFor(() => expect(screen.getByTestId('tc').textContent).toBe('1'))

    act(() => { emitWs('task:updated', DONE_TASK) })

    await waitFor(() => {
      const lc = JSON.parse(screen.getByTestId('lc').textContent!)
      expect(lc).not.toBeNull()
      expect(lc.taskId).toBe('t1')
      expect(typeof lc.completedAt).toBe('number')
    })
  })

  it('does NOT set lastCompletion when partner is offline (onlineUserIds empty)', async () => {
    mockOnlineUserIds = new Set() // partner offline
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('tc').textContent).toBe('1'))

    act(() => { emitWs('task:updated', DONE_TASK) })

    // Give state time to settle — if incorrectly set it would update by now
    await waitFor(() => {})
    expect(JSON.parse(screen.getByTestId('lc').textContent!)).toBeNull()
  })

  it('does NOT set lastCompletion when the task was already done (done→done)', async () => {
    initialTasks = [DONE_TASK] // task starts as done
    mockOnlineUserIds = new Set(['u2'])
    render(<TasksProvider><Harness /></TasksProvider>)
    await waitFor(() => expect(screen.getByTestId('tc').textContent).toBe('1'))

    // Another done echo arrives — no transition, just a no-op update
    act(() => { emitWs('task:updated', DONE_TASK) })

    await waitFor(() => {})
    expect(JSON.parse(screen.getByTestId('lc').textContent!)).toBeNull()
  })
})
