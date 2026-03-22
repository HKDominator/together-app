import { describe, it, expect } from 'vitest'
import { tasksReducer, VALID_TRANSITIONS } from '@/context/TasksContext'
import { State, Task, User } from '@/types'
import type { Action } from '@/context/TasksContext'

// ── Helpers ───────────────────────────────────────────────────────────
const user : User = { id: 'u1', name: 'Ana', role: 'owner', avatarColor: '#C0392B', initials: 'AP' }
const task1 : Task = { id: 't1', title: 'Test task', description: '', assigneeId: 'u1', createdById: 'u1', priority: 'high', state: 'todo', dueDate: null, createdAt: new Date(), updatedAt: new Date() }

const baseState : State = {
  tasks:       [task1],
  users:       [user],
  currentUser: user,
}

// ── ADD_TASK ──────────────────────────────────────────────────────────
describe('ADD_TASK', () => {
  it('adds a new task to the array', () => {
    const next = tasksReducer(baseState, {
      type:    'ADD_TASK',
      payload: { title: 'New task', assigneeId: 'u1', priority: 'medium', description: '', dueDate: '' },
    })
    expect(next.tasks).toHaveLength(2)
    expect(next.tasks[1].title).toBe('New task')
  })

  it('sets state to todo by default', () => {
    const next = tasksReducer(baseState, {
      type:    'ADD_TASK',
      payload: { title: 'New task', assigneeId: 'u1', priority: 'low', description: '', dueDate: '' },
    })
    expect(next.tasks[1].state).toBe('todo')
  })

  it('assigns a unique id', () => {
    const next = tasksReducer(baseState, {
      type:    'ADD_TASK',
      payload: { title: 'Task A', assigneeId: 'u1', priority: 'low', description: '', dueDate: ''},
    })
    const next2 = tasksReducer(next, {
      type:    'ADD_TASK',
      payload: { title: 'Task B', assigneeId: 'u1', priority: 'low', description: '', dueDate: '' },
    })
    const [a, b] = next2.tasks.slice(1)
    expect(a.id).not.toBe(b.id)
  })

  it('sets createdById to currentUser.id', () => {
    const next = tasksReducer(baseState, {
      type:    'ADD_TASK',
      payload: { title: 'New', assigneeId: 'u1', priority: 'low', description: '', dueDate: '' },
    })
    expect(next.tasks[1].createdById).toBe('u1')
  })
})

// ── UPDATE_TASK ───────────────────────────────────────────────────────
describe('UPDATE_TASK', () => {
  it('updates title of an existing task', () => {
    const next = tasksReducer(baseState, {
      type:    'UPDATE_TASK',
      payload: { id: 't1', changes: { title: 'Updated title' } },
    })
    expect(next.tasks[0].title).toBe('Updated title')
  })

  it('does NOT change id or createdAt', () => {
    const original = baseState.tasks[0]
    const next = tasksReducer(baseState, {
      type:    'UPDATE_TASK',
      payload: { id: 't1', changes: { id: 'hacked', createdAt: new Date(0) } },
    })
    expect(next.tasks[0].id).toBe(original.id)
    expect(next.tasks[0].createdAt).toEqual(original.createdAt)
  })

  it('leaves other tasks unchanged', () => {
    const task2 = { ...task1, id: 't2', title: 'Other task' }
    const state  = { ...baseState, tasks: [task1, task2] }
    const next   = tasksReducer(state, {
      type:    'UPDATE_TASK',
      payload: { id: 't1', changes: { title: 'Changed' } },
    })
    expect(next.tasks[1].title).toBe('Other task')
  })
})

// ── DELETE_TASK ───────────────────────────────────────────────────────
describe('DELETE_TASK', () => {
  it('removes the task with the given id', () => {
    const next = tasksReducer(baseState, {
      type:    'DELETE_TASK',
      payload: { id: 't1' },
    })
    expect(next.tasks).toHaveLength(0)
  })

  it('does nothing when id does not exist', () => {
    const next = tasksReducer(baseState, {
      type:    'DELETE_TASK',
      payload: { id: 'nonexistent' },
    })
    expect(next.tasks).toHaveLength(1)
  })
})

// ── SET_STATE ─────────────────────────────────────────────────────────
describe('SET_STATE', () => {
  it('transitions todo → in_progress', () => {
    const next = tasksReducer(baseState, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'in_progress' },
    })
    expect(next.tasks[0].state).toBe('in_progress')
  })

  it('transitions todo → cancelled', () => {
    const next = tasksReducer(baseState, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'cancelled' },
    })
    expect(next.tasks[0].state).toBe('cancelled')
  })

  it('transitions in_progress → done', () => {
    const state : State = { ...baseState, tasks: [{ ...task1, state: 'in_progress' }] }
    const next  = tasksReducer(state, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'done' },
    })
    expect(next.tasks[0].state).toBe('done')
  })

  it('does NOT allow invalid transition todo → done', () => {
    const next = tasksReducer(baseState, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'done' },
    })
    expect(next.tasks[0].state).toBe('todo')
  })

  it('does NOT allow any transition from done', () => {
    const state : State = { ...baseState, tasks: [{ ...task1, state: 'done' }] }
    const next  = tasksReducer(state, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'todo' },
    })
    expect(next.tasks[0].state).toBe('done')
  })

  it('does NOT allow any transition from cancelled', () => {
    const state : State = { ...baseState, tasks: [{ ...task1, state: 'cancelled' }] }
    const next  = tasksReducer(state, {
      type:    'SET_STATE',
      payload: { id: 't1', newState: 'todo' },
    })
    expect(next.tasks[0].state).toBe('cancelled')
  })
})

// ── VALID_TRANSITIONS export ──────────────────────────────────────────
describe('VALID_TRANSITIONS', () => {
  it('todo can go to in_progress and cancelled', () => {
    expect(VALID_TRANSITIONS.todo).toContain('in_progress')
    expect(VALID_TRANSITIONS.todo).toContain('cancelled')
  })

  it('done has no allowed transitions', () => {
    expect(VALID_TRANSITIONS.done).toHaveLength(0)
  })

  it('cancelled has no allowed transitions', () => {
    expect(VALID_TRANSITIONS.cancelled).toHaveLength(0)
  })
})

// ── Unknown action ────────────────────────────────────────────────────
describe('unknown action', () => {
  it('returns state unchanged', () => {
    const next = tasksReducer(baseState, { type: 'UNKNOWN' } as unknown as Action)
    expect(next).toEqual(baseState)
  })
})
