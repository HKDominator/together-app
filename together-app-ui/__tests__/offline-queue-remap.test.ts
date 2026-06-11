// BUG-20: tempId must be remapped in the queue after an offline create drains
// so that subsequent update/delete/state ops still reference the real server id.
import { describe, it, expect, beforeEach } from 'vitest'
import { offlineQueue } from '@/lib/offlineQueue'

beforeEach(() => { offlineQueue.clear() })

describe('offlineQueue.remapTempId (BUG-20)', () => {
  it('remaps taskId in queued update ops', () => {
    offlineQueue.enqueueUpdate('tmp_1', { title: 'Updated' })
    offlineQueue.remapTempId('tmp_1', 'real-abc')
    const ops = offlineQueue.list()
    expect(ops).toHaveLength(1)
    expect(ops[0]).toMatchObject({ kind: 'update', taskId: 'real-abc' })
  })

  it('remaps taskId in queued delete ops', () => {
    offlineQueue.enqueueDelete('tmp_1')
    offlineQueue.remapTempId('tmp_1', 'real-abc')
    const ops = offlineQueue.list()
    expect(ops[0]).toMatchObject({ kind: 'delete', taskId: 'real-abc' })
  })

  it('remaps taskId in queued state ops', () => {
    offlineQueue.enqueueStateChange('tmp_1', 'done')
    offlineQueue.remapTempId('tmp_1', 'real-abc')
    const ops = offlineQueue.list()
    expect(ops[0]).toMatchObject({ kind: 'state', taskId: 'real-abc' })
  })

  it('does not affect ops with a different taskId', () => {
    offlineQueue.enqueueUpdate('tmp_other', { title: 'Other' })
    offlineQueue.remapTempId('tmp_1', 'real-abc')
    expect(offlineQueue.list()[0]).toMatchObject({ taskId: 'tmp_other' })
  })

  it('remaps multiple queued ops targeting the same tempId', () => {
    offlineQueue.enqueueUpdate('tmp_1', { title: 'First edit' })
    offlineQueue.enqueueStateChange('tmp_1', 'in_progress')
    offlineQueue.remapTempId('tmp_1', 'real-abc')
    const ops = offlineQueue.list()
    expect(ops[0]).toMatchObject({ taskId: 'real-abc' })
    expect(ops[1]).toMatchObject({ taskId: 'real-abc' })
  })
})
