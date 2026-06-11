// FD-06 Step 4: task detail page emits viewing presence on mount/unmount and
// shows a quiet co-presence line when the partner is looking at the same task.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TaskDetailContent } from '@/app/(app)/tasks/[id]/page'
import type { Task, User } from '@/types'

const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const TASK: Task = {
  id: 't1', title: 'Buy milk', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date('2025-01-01') as unknown as Date,
  updatedAt: new Date('2025-01-01') as unknown as Date,
}

const mockSetViewing = vi.fn()
let mockViewingByUser: Record<string, string> = {}

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/components/tasks/CommentsThread', () => ({ default: () => null }))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [TASK], users: [SELF, PARTNER], currentUser: SELF,
    updateTask: vi.fn(), deleteTask: vi.fn(), setTaskState: vi.fn(),
  }),
  VALID_TRANSITIONS: {
    todo: ['in_progress', 'cancelled'], in_progress: ['done', 'cancelled'],
    done: [], cancelled: [],
  },
}))
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({
    onlineUserIds:  new Set<string>(),
    viewingByUser:  mockViewingByUser,
    setViewingTask: mockSetViewing,
  }),
}))

describe('Task Detail Page — viewing presence (FD-06 Step 4)', () => {
  beforeEach(() => { mockSetViewing.mockReset(); mockViewingByUser = {} })

  it('calls setViewingTask(id) on mount so the server knows we are looking', () => {
    render(<TaskDetailContent id="t1" />)
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(mockSetViewing).toHaveBeenCalledWith('t1')
  })

  it('calls setViewingTask(null) on unmount so the server clears our focus', () => {
    const { unmount } = render(<TaskDetailContent id="t1" />)
    mockSetViewing.mockReset()

    act(() => { unmount() })
    expect(mockSetViewing).toHaveBeenCalledWith(null)
  })

  it('shows a quiet co-presence line when partner is viewing the same task', () => {
    mockViewingByUser = { u2: 't1' }
    render(<TaskDetailContent id="t1" />)
    expect(screen.getByText(/bora is looking at this too/i)).toBeInTheDocument()
  })

  it('hides the co-presence line when partner is viewing a different task', () => {
    mockViewingByUser = { u2: 't99' }
    render(<TaskDetailContent id="t1" />)
    expect(screen.queryByText(/looking at this too/i)).toBeNull()
  })
})
