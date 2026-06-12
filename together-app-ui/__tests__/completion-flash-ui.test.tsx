// Completion flash: when a task moves not-done → done while the partner is
// online, the task row gets a warm wash (row-flash-active) and the chip gets
// a scale pulse (chip-scale-flash). Both are CSS-animation classes — the
// global prefers-reduced-motion block suppresses the animations for motion-
// sensitive users while keeping the color/opacity crossfade.
//
// The hard amber ring (ring-amber-400) is intentionally gone: it read as a
// focus/selection affordance, not the warm relational beat the design calls for.
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

// ── Task row ──────────────────────────────────────────────────────────
describe('Task row — completion flash (warm wash + chip scale)', () => {
  it('row carries row-flash-active when lastCompletion.taskId matches', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TasksPage />)
    const row = screen.getByTestId('task-row-t1')
    expect(row.className).toContain('row-flash-active')
  })

  it('row has no row-flash-active when lastCompletion is null', () => {
    mockLastCompletion = null
    render(<TasksPage />)
    const row = screen.getByTestId('task-row-t1')
    expect(row.className).not.toContain('row-flash-active')
  })

  it('row has no row-flash-active when a different task completed', () => {
    mockLastCompletion = { taskId: 'other', completedAt: Date.now() }
    render(<TasksPage />)
    const row = screen.getByTestId('task-row-t1')
    expect(row.className).not.toContain('row-flash-active')
  })

  it('chip carries chip-scale-flash when lastCompletion.taskId matches', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TasksPage />)
    const chip = screen.getByTestId('row-chip-t1')
    expect(chip.className).toContain('chip-scale-flash')
  })

  it('chip has no chip-scale-flash when lastCompletion is null', () => {
    mockLastCompletion = null
    render(<TasksPage />)
    const chip = screen.getByTestId('row-chip-t1')
    expect(chip.className).not.toContain('chip-scale-flash')
  })

  it('chip no longer carries the hard amber ring', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TasksPage />)
    const chip = screen.getByTestId('row-chip-t1')
    expect(chip.className).not.toContain('ring-amber-400')
  })
})

// ── Task detail chip ───────────────────────────────────────────────────
describe('Task detail — completion flash chip', () => {
  it('detail chip carries chip-scale-flash when lastCompletion.taskId matches', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).toContain('chip-scale-flash')
  })

  it('detail chip has no chip-scale-flash when lastCompletion is null', () => {
    mockLastCompletion = null
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).not.toContain('chip-scale-flash')
  })

  it('detail chip no longer carries the hard amber ring', () => {
    mockLastCompletion = { taskId: 't1', completedAt: Date.now() }
    render(<TaskDetailContent id="t1" />)
    const wrapper = screen.getByTestId('detail-chip')
    expect(wrapper.className).not.toContain('ring-amber-400')
  })
})
