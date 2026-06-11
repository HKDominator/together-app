// Wave 4 / FD-06 plumbing: the WS handshake is only authenticated at connect
// time. If the access cookie has expired when socket.io reconnects, the server
// rejects the socket ('io server disconnect') — a reason socket.io never
// auto-retries. Without recovery the realtime layer (and presence) dies
// silently until a full page reload.
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Handler = (...args: unknown[]) => void
const handlers: Record<string, Handler[]> = {}
const fakeSocket = {
  on:         vi.fn((ev: string, fn: Handler) => { (handlers[ev] ??= []).push(fn) }),
  off:        vi.fn(),
  disconnect: vi.fn(),
  connect:    vi.fn(),
}
const refreshOnceMock = vi.fn<() => Promise<boolean>>()

vi.mock('socket.io-client', () => ({ io: vi.fn(() => fakeSocket) }))
vi.mock('@/lib/api', () => ({ refreshOnce: refreshOnceMock }))

const fire = (ev: string, ...args: unknown[]) => handlers[ev]?.forEach(fn => fn(...args))
const flush = () => new Promise(res => setTimeout(res, 0))

beforeEach(() => {
  vi.resetModules()
  for (const k of Object.keys(handlers)) delete handlers[k]
  fakeSocket.connect.mockClear()
  refreshOnceMock.mockReset()
})

describe('socket auth-reconnect (FD-06 plumbing)', () => {
  it('refreshes the session and reconnects after a server-side disconnect', async () => {
    refreshOnceMock.mockResolvedValue(true)
    const { getSocket } = await import('@/lib/ws')
    getSocket()

    fire('disconnect', 'io server disconnect')
    await flush()

    expect(refreshOnceMock).toHaveBeenCalledTimes(1)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)
  })

  it('leaves transient drops to socket.io auto-reconnect (no refresh)', async () => {
    refreshOnceMock.mockResolvedValue(true)
    const { getSocket } = await import('@/lib/ws')
    getSocket()

    fire('disconnect', 'transport close')
    fire('disconnect', 'ping timeout')
    await flush()

    expect(refreshOnceMock).not.toHaveBeenCalled()
    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })

  it('does not reconnect when the refresh fails (session is dead)', async () => {
    refreshOnceMock.mockResolvedValue(false)
    const { getSocket } = await import('@/lib/ws')
    getSocket()

    fire('disconnect', 'io server disconnect')
    await flush()

    expect(refreshOnceMock).toHaveBeenCalledTimes(1)
    expect(fakeSocket.connect).not.toHaveBeenCalled()
  })

  it('gives up after 3 consecutive rejections instead of looping forever', async () => {
    refreshOnceMock.mockResolvedValue(true)
    const { getSocket } = await import('@/lib/ws')
    getSocket()

    for (let i = 0; i < 5; i++) {
      fire('disconnect', 'io server disconnect')
      await flush()
    }

    expect(fakeSocket.connect).toHaveBeenCalledTimes(3)
  })

  it('a successful connect restores the retry budget', async () => {
    refreshOnceMock.mockResolvedValue(true)
    const { getSocket } = await import('@/lib/ws')
    getSocket()

    for (let i = 0; i < 5; i++) {
      fire('disconnect', 'io server disconnect')
      await flush()
    }
    fire('connect')
    fire('disconnect', 'io server disconnect')
    await flush()

    expect(fakeSocket.connect).toHaveBeenCalledTimes(4)
  })

  it('chat socket recovers from a server-side disconnect the same way', async () => {
    refreshOnceMock.mockResolvedValue(true)
    const { getChatSocket } = await import('@/lib/chat-ws')
    getChatSocket()

    fire('disconnect', 'io server disconnect')
    await flush()

    expect(refreshOnceMock).toHaveBeenCalledTimes(1)
    expect(fakeSocket.connect).toHaveBeenCalledTimes(1)
  })
})
