// BUG-23: offlineQueue localStorage read-modify-write is not multi-tab safe.
// The fix uses per-op keys so enqueue is a single setItem — no race.
import { describe, it, expect, beforeEach } from 'vitest'
import { offlineQueue } from '@/lib/offlineQueue'

const LEGACY_KEY = 'together_offline_queue'

beforeEach(() => { offlineQueue.clear() })

describe('offlineQueue multi-tab safety (BUG-23)', () => {
  it('op survives a concurrent overwrite of the legacy array key', () => {
    const op = offlineQueue.enqueueUpdate('t1', { title: 'My edit' })

    // Simulate another tab reading the OLD array key and writing back an empty queue
    // (it hadn't seen op yet so it overwrites with []).
    // With the old array-based implementation this would erase op.
    window.localStorage.setItem(LEGACY_KEY, '[]')

    const ops = offlineQueue.list()
    expect(ops.find(o => o.id === op.id)).toBeDefined()
  })

  it('two rapid enqueues both survive', () => {
    const op1 = offlineQueue.enqueueUpdate('t1', { title: 'First' })
    const op2 = offlineQueue.enqueueStateChange('t2', 'done')

    const ops = offlineQueue.list()
    expect(ops.find(o => o.id === op1.id)).toBeDefined()
    expect(ops.find(o => o.id === op2.id)).toBeDefined()
  })
})
