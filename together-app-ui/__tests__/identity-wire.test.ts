// BUG-17/18/19 — frontend identity wire.
// The optimisticTask helper hardcodes createdById:'u1'. After the fix it
// must use the caller-supplied id. We test the pure helper directly.
import { describe, it, expect } from 'vitest'
import { makeOptimisticTask } from '@/context/TasksContext'

describe('makeOptimisticTask (BUG-19)', () => {
  const dto = {
    title: 'My task', assigneeId: 'u-2', priority: 'high' as const,
    description: '', dueDate: null,
  }

  it('uses the supplied createdById, not a hardcoded placeholder', () => {
    const t = makeOptimisticTask(dto, 'tmp_1', 'actual-user-uuid')
    expect(t.createdById).toBe('actual-user-uuid')
  })

  it('does not produce the old hardcoded u1 placeholder', () => {
    const t = makeOptimisticTask(dto, 'tmp_1', 'actual-user-uuid')
    expect(t.createdById).not.toBe('u1')
  })

  it('preserves all other dto fields', () => {
    const t = makeOptimisticTask(dto, 'tmp_1', 'actual-user-uuid')
    expect(t.title).toBe('My task')
    expect(t.assigneeId).toBe('u-2')
    expect(t.state).toBe('todo')
  })
})
