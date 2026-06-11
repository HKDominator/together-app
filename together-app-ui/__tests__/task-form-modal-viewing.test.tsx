// FD-06 Step 4: TaskFormModal in edit mode emits viewing focus on open and
// clears it on close. Create mode and tmp_ ids are no-ops (BUG-25 guard).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import type { Task } from '@/types'

const TASK: Task = {
  id: 't1', title: 'Buy milk', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date() as unknown as Date,
  updatedAt: new Date() as unknown as Date,
}
const TMP_TASK: Task = { ...TASK, id: 'tmp_123_abc' }

const mockSetViewing = vi.fn()

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [{ id: 'u1', name: 'Ana' }] }),
}))
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({ onlineUserIds: new Set(), viewingByUser: {}, setViewingTask: mockSetViewing }),
}))

const noop = vi.fn().mockResolvedValue(undefined)

describe('TaskFormModal — viewing presence (FD-06 Step 4)', () => {
  beforeEach(() => { mockSetViewing.mockReset(); noop.mockReset().mockResolvedValue(undefined) })

  it('calls setViewingTask(task.id) when opened in edit mode', () => {
    render(<TaskFormModal isOpen task={TASK} onClose={vi.fn()} onSubmit={noop} />)
    expect(mockSetViewing).toHaveBeenCalledWith('t1')
  })

  it('calls setViewingTask(null) when isOpen switches to false (parent hides modal)', () => {
    const { rerender } = render(<TaskFormModal isOpen task={TASK} onClose={vi.fn()} onSubmit={noop} />)
    mockSetViewing.mockReset()

    rerender(<TaskFormModal isOpen={false} task={TASK} onClose={vi.fn()} onSubmit={noop} />)
    expect(mockSetViewing).toHaveBeenCalledWith(null)
  })

  it('does not call setViewingTask in create mode (no task prop)', () => {
    render(<TaskFormModal isOpen task={null} onClose={vi.fn()} onSubmit={noop} />)
    expect(mockSetViewing).not.toHaveBeenCalled()
  })

  it('does not call setViewingTask for a tmp_ task id (BUG-25 guard)', () => {
    render(<TaskFormModal isOpen task={TMP_TASK} onClose={vi.fn()} onSubmit={noop} />)
    expect(mockSetViewing).not.toHaveBeenCalled()
  })
})
