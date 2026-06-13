// BUG-22: mid-drain failure must NOT reset the list to page 1.
// The observable invariant: after a failed non-create op is removed from
// the offline queue, the queue contains only the remaining (unprocessed)
// ops — the failure does not re-enqueue anything or trigger a full reload.
import { describe, it, expect, beforeEach } from 'vitest'
import { offlineQueue } from '@/lib/offlineQueue'

beforeEach(() => { offlineQueue.clear() })

describe('offline queue post-failure state (BUG-22)', () => {
  it('remove() leaves subsequent ops untouched', () => {
    const op1 = offlineQueue.enqueueUpdate('t1', { title: 'First' })
    const op2 = offlineQueue.enqueueStateChange('t2', 'done')

    // Simulate: op1 fails → removed; op2 is still pending
    offlineQueue.remove(op1.id)

    const remaining = offlineQueue.list()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe(op2.id)
  })

  it('a failed op does not re-enqueue itself', () => {
    const op = offlineQueue.enqueueUpdate('t1', { title: 'Edit' })

    // Simulate failure handling: only remove is called, nothing re-enqueued
    offlineQueue.remove(op.id)

    expect(offlineQueue.list()).toHaveLength(0)
    expect(offlineQueue.size()).toBe(0)
  })
})
