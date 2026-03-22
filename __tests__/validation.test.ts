import { describe, it, expect } from 'vitest'
import { validateTask, validateLogin, isValid } from '@/lib/validation'
import { Priority } from '@/types'

// ── validateTask ──────────────────────────────────────────────────────
describe('validateTask — title', () => {
  it('errors when title is empty', () => {
    const errs = validateTask({ title: '', assigneeId: 'u1', priority: 'high' })
    expect(errs.title).toBeDefined()
  })

  it('errors when title is whitespace only', () => {
    const errs = validateTask({ title: '   ', assigneeId: 'u1', priority: 'high' })
    expect(errs.title).toBeDefined()
  })

  it('errors when title is under 3 chars', () => {
    const errs = validateTask({ title: 'Hi', assigneeId: 'u1', priority: 'high' })
    expect(errs.title).toBeDefined()
  })

  it('errors when title exceeds 100 chars', () => {
    const errs = validateTask({ title: 'a'.repeat(101), assigneeId: 'u1', priority: 'high' })
    expect(errs.title).toBeDefined()
  })

  it('passes with a valid title', () => {
    const errs = validateTask({ title: 'Valid task title', assigneeId: 'u1', priority: 'high' })
    expect(errs.title).toBeUndefined()
  })
})

describe('validateTask — description', () => {
  it('passes when description is empty (optional)', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', description: '' })
    expect(errs.description).toBeUndefined()
  })

  it('passes when description is undefined', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high' })
    expect(errs.description).toBeUndefined()
  })

  it('errors when description exceeds 500 chars', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', description: 'a'.repeat(501) })
    expect(errs.description).toBeDefined()
  })
})

describe('validateTask — assigneeId', () => {
  it('errors when assigneeId is missing', () => {
    const errs = validateTask({ title: 'Valid', priority: 'high' })
    expect(errs.assigneeId).toBeDefined()
  })

  it('errors when assigneeId is empty string', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: '', priority: 'high' })
    expect(errs.assigneeId).toBeDefined()
  })

  it('passes when assigneeId is provided', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high' })
    expect(errs.assigneeId).toBeUndefined()
  })
})

describe('validateTask — priority', () => {
  it('errors when priority is missing', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1' })
    expect(errs.priority).toBeDefined()
  })

  it('errors when priority is invalid value', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'urgent' as unknown as Priority})
    expect(errs.priority).toBeDefined()
  })

  it('passes for high', () => expect(validateTask({ title: 'V', assigneeId: 'u1', priority: 'high'   }).priority).toBeUndefined())
  it('passes for medium', () => expect(validateTask({ title: 'V', assigneeId: 'u1', priority: 'medium' }).priority).toBeUndefined())
  it('passes for low', () => expect(validateTask({ title: 'V', assigneeId: 'u1', priority: 'low'    }).priority).toBeUndefined())
})

describe('validateTask — dueDate (create mode)', () => {
  it('errors when due date is in the past on create', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', dueDate: '2020-01-01' }, 'create')
    expect(errs.dueDate).toBeDefined()
  })

  it('passes when due date is today or future', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', dueDate: future.toISOString().split('T')[0] }, 'create')
    expect(errs.dueDate).toBeUndefined()
  })

  it('passes when due date is empty (optional)', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', dueDate: '' }, 'create')
    expect(errs.dueDate).toBeUndefined()
  })

  it('does NOT check past date in edit mode', () => {
    const errs = validateTask({ title: 'Valid', assigneeId: 'u1', priority: 'high', dueDate: '2020-01-01' }, 'edit')
    expect(errs.dueDate).toBeUndefined()
  })
})

// ── validateLogin ─────────────────────────────────────────────────────
describe('validateLogin', () => {
  it('errors on invalid email', () => {
    const errs = validateLogin({ email: 'notanemail', password: 'password123' })
    expect(errs.email).toBeDefined()
  })

  it('errors on missing email', () => {
    const errs = validateLogin({ email: '', password: 'password123' })
    expect(errs.email).toBeDefined()
  })

  it('errors when password is under 8 chars', () => {
    const errs = validateLogin({ email: 'a@b.com', password: 'short' })
    expect(errs.password).toBeDefined()
  })

  it('passes with valid email and password', () => {
    const errs = validateLogin({ email: 'user@example.com', password: 'securepassword' })
    expect(errs).toEqual({})
  })
})

// ── isValid ────────────────────────────────────────────────────────────
describe('isValid', () => {
  it('returns true when errors object is empty', () => {
    expect(isValid({})).toBe(true)
  })

  it('returns false when errors object has keys', () => {
    expect(isValid({ title: 'Required' })).toBe(false)
  })
})
