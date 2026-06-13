// FD-06 Step 4: partner initials bubble appears in task row when partner is
// actively viewing that task. Aria-label gives screen readers context.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'
import type { Task, User } from '@/types'

const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const TASK: Task = {
  id: 't1', title: 'Buy milk', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date() as unknown as Date,
  updatedAt: new Date() as unknown as Date,
}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, prefetchRef: { current: null } }),
}))
vi.mock('@/lib/activity', () => ({ trackSearch: vi.fn(), trackFilters: vi.fn(), trackTask: vi.fn() }))
vi.mock('@/lib/api', () => ({
  api: { listTasks: vi.fn().mockResolvedValue({ items: [], page: 1, total: 0, totalPages: 1 }) },
}))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [TASK], users: [SELF, PARTNER], currentUser: SELF,
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    pendingCount: 0, generatorRunning: false,
    startGenerator: vi.fn(), stopGenerator: vi.fn(),
    hasMore: false, totalTasks: 1, isLoadingMore: false,
    loadMore: vi.fn(), prefetchNext: vi.fn(),
    drainError: null, clearDrainError: vi.fn(),
  }),
}))

let mockViewingByUser: Record<string, string> = {}
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({
    onlineUserIds:  new Set<string>(),
    viewingByUser:  mockViewingByUser,
    setViewingTask: vi.fn(),
  }),
}))

describe('Task row partner bubble (FD-06 Step 4)', () => {
  it('shows partner initials bubble when partner is viewing that task row', () => {
    mockViewingByUser = { u2: 't1' }
    render(<TasksPage />)
    expect(
      screen.getByRole('img', { name: /bora is viewing this task/i }),
    ).toBeInTheDocument()
  })

  it('hides the bubble when partner is viewing a different task', () => {
    mockViewingByUser = { u2: 'other-task' }
    render(<TasksPage />)
    expect(
      screen.queryByRole('img', { name: /bora is viewing this task/i }),
    ).toBeNull()
  })

  it('hides the bubble when partner has no viewing focus', () => {
    mockViewingByUser = {}
    render(<TasksPage />)
    expect(
      screen.queryByRole('img', { name: /bora is viewing this task/i }),
    ).toBeNull()
  })

  it('partner bubble has an aria-label naming the partner and the action', () => {
    mockViewingByUser = { u2: 't1' }
    render(<TasksPage />)
    const bubble = screen.getByRole('img', { name: /bora is viewing this task/i })
    expect(bubble).toHaveAttribute('aria-label', 'Bora is viewing this task')
  })

  it('partner bubble carries bubble-enter class for enter animation', () => {
    mockViewingByUser = { u2: 't1' }
    render(<TasksPage />)
    const bubble = screen.getByRole('img', { name: /bora is viewing this task/i })
    expect(bubble.className).toContain('bubble-enter')
  })
})
