// ─────────────────────────────────────────────────────────────────────
// Destination: __tests__/tasksReducer.test.ts
// REPLACEMENT for the Bronze-era file.
//
// The old reducer tested ADD_TASK / UPDATE_TASK / DELETE_TASK / SET_STATE
// actions. The Silver refactor moved that business logic to the backend
// and to async methods on TasksProvider. What remains in the reducer is
// a small sync state machine for local cache: SET_TASKS, UPSERT, REMOVE,
// REPLACE_ID.
//
// The state-machine correctness tests (valid transitions) now live in
// the backend under src/tasks/tasks.service.spec.ts — that's where the
// business logic moved.
// ─────────────────────────────────────────────────────────────────────
import { describe, it, expect } from 'vitest'
import { tasksReducer, VALID_TRANSITIONS } from '@/context/TasksContext'
import { Task } from '@/types'

const makeTask = (over: Partial<Task> = {}): Task => ({
  id:          't1',
  title:       'Test task',
  description: '',
  assigneeId:  'u1',
  createdById: 'u1',
  priority:    'high',
  state:       'todo',
  dueDate:     null,
  createdAt:   new Date(),
  updatedAt:   new Date(),
  ...over,
})

const base = { tasks: [makeTask()] }

// ── SET_TASKS ─────────────────────────────────────────────────────────
describe('SET_TASKS', () => {
  it('replaces the whole tasks array', () => {
    const a = makeTask({ id: 'a' })
    const b = makeTask({ id: 'b' })
    const next = tasksReducer(base, { type: 'SET_TASKS', payload: [a, b] })
    expect(next.tasks).toEqual([a, b])
  })

  it('can replace with an empty array', () => {
    const next = tasksReducer(base, { type: 'SET_TASKS', payload: [] })
    expect(next.tasks).toHaveLength(0)
  })
})

// ── UPSERT ────────────────────────────────────────────────────────────
describe('UPSERT', () => {
  it('inserts a new task at the head when id is not present', () => {
    const fresh = makeTask({ id: 't2', title: 'New one' })
    const next  = tasksReducer(base, { type: 'UPSERT', payload: fresh })
    expect(next.tasks).toHaveLength(2)
    expect(next.tasks[0].id).toBe('t2')  // newest first
  })

  it('replaces an existing task in-place when id matches', () => {
    const updated = makeTask({ id: 't1', title: 'Edited' })
    const next    = tasksReducer(base, { type: 'UPSERT', payload: updated })
    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0].title).toBe('Edited')
  })

  it('is idempotent — upserting the same task twice produces the same state', () => {
    const fresh = makeTask({ id: 't3' })
    const once  = tasksReducer(base, { type: 'UPSERT', payload: fresh })
    const twice = tasksReducer(once,  { type: 'UPSERT', payload: fresh })
    expect(twice.tasks).toEqual(once.tasks)
  })
})

// ── REMOVE ────────────────────────────────────────────────────────────
describe('REMOVE', () => {
  it('drops the task with matching id', () => {
    const next = tasksReducer(base, { type: 'REMOVE', payload: { id: 't1' } })
    expect(next.tasks).toHaveLength(0)
  })

  it('is a no-op for an unknown id', () => {
    const next = tasksReducer(base, { type: 'REMOVE', payload: { id: 'nope' } })
    expect(next.tasks).toHaveLength(1)
  })
})

// ── REPLACE_ID ────────────────────────────────────────────────────────
describe('REPLACE_ID (optimistic → real after server ack)', () => {
  it('swaps the task whose id matches oldId with the new task', () => {
    const optimistic = makeTask({ id: 'tmp_123', title: 'optimistic' })
    const seed       = { tasks: [optimistic] }
    const real       = makeTask({ id: 'server-id', title: 'real' })
    const next = tasksReducer(seed, { type: 'REPLACE_ID', payload: { oldId: 'tmp_123', task: real } })
    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0].id).toBe('server-id')
    expect(next.tasks[0].title).toBe('real')
  })

  it('falls back to prepending when oldId is not found', () => {
    const real = makeTask({ id: 'server-id' })
    const next = tasksReducer(base, { type: 'REPLACE_ID', payload: { oldId: 'ghost', task: real } })
    expect(next.tasks).toHaveLength(2)
    expect(next.tasks[0].id).toBe('server-id')
  })
})

// ── VALID_TRANSITIONS export stays authoritative on the client ───────
describe('VALID_TRANSITIONS', () => {
  it('todo can go to in_progress and cancelled', () => {
    expect(VALID_TRANSITIONS.todo).toContain('in_progress')
    expect(VALID_TRANSITIONS.todo).toContain('cancelled')
  })

  it('done and cancelled are terminal', () => {
    expect(VALID_TRANSITIONS.done).toHaveLength(0)
    expect(VALID_TRANSITIONS.cancelled).toHaveLength(0)
  })
})
