// FD-05: identity-aware framing — task rows and detail show
// "You" for the current user and the partner's name for the partner.
// CommentsThread author framing is in fd05-comments-framing.test.tsx.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'
import { TaskDetailContent } from '@/app/(app)/tasks/[id]/page'
import type { Task, User } from '@/types'

// ── fixtures ──────────────────────────────────────────────────────────
const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const BASE_TASK: Task = {
  id: 't1', title: 'Task A', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date('2025-01-01') as unknown as Date,
  updatedAt: new Date('2025-01-01') as unknown as Date,
}

let mockTasks: Task[] = [BASE_TASK]

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
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: mockTasks, users: [SELF, PARTNER], currentUser: SELF,
    isOnline: true, isLoading: false, isLoadingMore: false,
    hasMore: false, totalTasks: 1, pendingCount: 0, generatorRunning: false,
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(), setTaskState: vi.fn(),
    loadMore: vi.fn(), prefetchNext: vi.fn(),
    startGenerator: vi.fn(), stopGenerator: vi.fn(),
    lastCompletion: null, drainError: null, clearDrainError: vi.fn(),
  }),
  VALID_TRANSITIONS: {
    todo: ['in_progress', 'cancelled'], in_progress: ['done', 'cancelled'],
    done: [], cancelled: [],
  },
}))

beforeEach(() => { mockTasks = [BASE_TASK] })

// ── Task row: assignee identity label ─────────────────────────────────
describe('FD-05 — task row assignee label', () => {
  it('shows "You" in the assignee column when task is assigned to currentUser', () => {
    mockTasks = [{ ...BASE_TASK, assigneeId: 'u1' }]
    render(<TasksPage />)
    const row = screen.getByRole('row')
    expect(within(row).getByText('You')).toBeInTheDocument()
  })

  it('shows the partner name in the assignee column when task is assigned to partner', () => {
    mockTasks = [{ ...BASE_TASK, assigneeId: 'u2' }]
    render(<TasksPage />)
    const row = screen.getByRole('row')
    expect(within(row).getByText('Bora')).toBeInTheDocument()
  })
})

// ── Task detail: "Assigned to" sidebar row ────────────────────────────
describe('FD-05 — task detail "Assigned to" label', () => {
  it('shows "You" in the Assigned to row when task is assigned to currentUser', () => {
    mockTasks = [{ ...BASE_TASK, assigneeId: 'u1' }]
    render(<TaskDetailContent id="t1" />)
    const section = screen.getByText('Assigned to').closest('div')!
    expect(within(section).getByText('You')).toBeInTheDocument()
  })

  it('shows the partner name in Assigned to row when task is assigned to partner', () => {
    mockTasks = [{ ...BASE_TASK, assigneeId: 'u2' }]
    render(<TaskDetailContent id="t1" />)
    const section = screen.getByText('Assigned to').closest('div')!
    expect(within(section).getByText('Bora')).toBeInTheDocument()
  })
})

// ── Task detail: activity section ─────────────────────────────────────
describe('FD-05 — task detail activity labels', () => {
  it('shows "You" as the creator name in the activity section when currentUser created the task', () => {
    mockTasks = [{ ...BASE_TASK, createdById: 'u1' }]
    render(<TaskDetailContent id="t1" />)
    // Activity renders: <span class="font-semibold">You</span> created this task
    const activitySpan = screen.getByText('You', { selector: 'span.font-semibold' })
    expect(activitySpan).toBeInTheDocument()
  })

  it('shows the partner name as creator in activity when partner created the task', () => {
    mockTasks = [{ ...BASE_TASK, createdById: 'u2' }]
    render(<TaskDetailContent id="t1" />)
    expect(screen.getByText('Bora', { selector: 'span.font-semibold' })).toBeInTheDocument()
  })
})
