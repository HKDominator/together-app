// BUG-10: generator run-state is process-local (in-memory). This spec
// verifies the expected single-instance behaviour and documents that
// multi-instance correctness requires a shared store (Redis/DB flag).
import { TaskGeneratorService } from './task-generator.service'

const makeService = () => {
  const tasks   = { create: jest.fn(async () => ({ id: 't1' })) }
  const users   = { findAll: jest.fn(async () => [{ id: 'u1', name: 'Ana' }]) }
  const gateway = { emitGeneratorStarted: jest.fn(), emitGeneratorStopped: jest.fn() }
  const svc = new TaskGeneratorService(tasks as any, users as any, gateway as any)
  return { svc, gateway }
}

describe('TaskGeneratorService — state (BUG-10: process-local)', () => {
  afterEach(() => jest.clearAllTimers())

  it('status() is false before start', () => {
    const { svc } = makeService()
    expect(svc.status().running).toBe(false)
  })

  it('start() sets status to running and emits event', () => {
    jest.useFakeTimers()
    const { svc, gateway } = makeService()
    svc.start()
    expect(svc.status().running).toBe(true)
    expect(gateway.emitGeneratorStarted).toHaveBeenCalledTimes(1)
    svc.stop()
    jest.useRealTimers()
  })

  it('stop() sets status to stopped and emits event', () => {
    jest.useFakeTimers()
    const { svc, gateway } = makeService()
    svc.start()
    svc.stop()
    expect(svc.status().running).toBe(false)
    expect(gateway.emitGeneratorStopped).toHaveBeenCalledTimes(1)
    jest.useRealTimers()
  })

  it('calling start() twice is idempotent (no double-emit)', () => {
    jest.useFakeTimers()
    const { svc, gateway } = makeService()
    svc.start()
    svc.start()   // second call should be a no-op
    expect(gateway.emitGeneratorStarted).toHaveBeenCalledTimes(1)
    svc.stop()
    jest.useRealTimers()
  })
})
