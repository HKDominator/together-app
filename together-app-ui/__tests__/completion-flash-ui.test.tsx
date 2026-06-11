// Step 5 — UI layer: when TasksContext.lastCompletion.taskId matches a task,
// both the task-row chip and the task-detail chip get the warm amber ring
// (ring-amber-400). The motion-safe: prefix on transitions means reduced-motion
// gets a static ring and standard motion gets a crossfade.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'
import { TaskDetailContent } from '@/app/(app)/tasks/[id]/page'
import type { Task, User } from '@/types'

// ── shared fixtures ────────────────────────────────────────────────────
const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const DONE_TASK: Task = {
  id: 't1', title: 'Task A', description: '', state: 'done', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date('2025-01-01') as unknown as Date,
  updatedAt: new Date('2025-01-01') as unknown as Date,
}

// ── common mocks ───────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, prefetchRef: { current: null } }),
}))
vi.mock('@/lib/activity', () => ({ trackSearch: vi.fn(), trackFilters: vi.fn(), trackTask: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api: { listTasks: vi.fn().mockResolvedValue({ items: [], page: 1, total: 0, totalPages: 1 }) },
}))
vi.mock('@/components/tasks/CommentsThread', () => ({ default: () => null }))
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({ onlineUserIds: new Set<string>(), viewingByUser: {}, setViewingTask: vi.fn() }),
}))

// ── TasksContext mock — lastCompletion controlled per describe block ────
let mockLastCompletion: { taskId: string; completedAt: number } | null = null

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [DONE_TASK], users: [SELF, PARTNER], currentUser: SELF,
    isOnline: true, isLoading: false, isLoadingMore: false,
    hasMore: false, totalTasks: 1, pendingCount: 0, generatorRunning: false,
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), setTaskState: vi.fn(),
    loadMore: vi.fn(), prefetchNext: vi.fn(),
    startGenerator: vi.fn(), stopGenerator: vi.fn(),
    drainError: null, clearDrainError: vi.fn(),
    lastCompletion: mockLastCompletion,
  }),
  VALID_TRANSITIONS: {
    todo: ['in_progress', 'cancelled'], in_progress: ['done', 'cancelled'],
    done: [], cancelled: [],
  },
}))

// ── Task row chip ──────────────────────────────────────────────────────
describe('Task row — completion flash chip (Step 5)', () => {
  it('row chip wrapper carries ring-amber-400 when lastCompletion.taskId matches the task', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TasksPage />)
    const wrapper = screen.getByTestId('row-chip-t1')
    expect(wrapper.className).toContain('ring-amber-400')
  })

  it('row chip wrapper has no amber ring when lastCompletion is null', () => {
    mockLastCompletion = null
    render(<TasksPage />)
    const wrapper = screen.getByTestId('row-chip-t1')
    expect(wrapper.className).not.toContain('ring-amber-400')
  })

  it('row chip wrapper has no amber ring when lastCompletion.taskId is a different task', () => {
    mockLastCompletion = { taskId: 'other-task', completedAt: Date.now() }
    render(<TasksPage />)
    const wrapper = screen.getByTestId('row-chip-t1')
    expect(wrapper.className).not.toContain('ring-amber-400')
  })

  it('row chip wrapper always carries motion-safe transition for smooth crossfade', () => {
    mockLastCompletion = null
    render(<TasksPage />)
    const wrapper = screen.getByTestId('row-chip-t1')
    expect(wrapper.className).toContain('motion-safe:transition-all')
  })
})

// ── Task detail chip ───────────────────────────────────────────────────
describe('Task detail — completion flash chip (Step 5)', () => {
  it('detail chip wrapper carries ring-amber-400 when lastCompletion.taskId matches', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).toContain('ring-amber-400')
  })

  it('detail chip wrapper has no amber ring when lastCompletion is null', () => {
    mockLastCompletion = null
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).not.toContain('ring-amber-400')
  })

  it('detail chip wrapper always carries motion-safe transition for smooth crossfade', () => {
    mockLastCompletion = null
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).toContain('motion-safe:transition-all')
  })
})
