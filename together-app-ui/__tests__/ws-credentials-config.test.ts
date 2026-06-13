// Wave 4 / FD-06 plumbing: the WS handshake is authenticated via the access
// cookie (SEC-04). The websocket transport sends cookies on its own, but the
// polling fallback (BUG-27) is a plain XHR — cross-origin it sends no cookies
// unless withCredentials is set. Without it a polling-only client fails the
// handshake auth and silently appears offline forever.
import { describe, it, expect, vi } from 'vitest'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn(), connect: vi.fn() })),
}))

import { io }            from 'socket.io-client'
import { getSocket }     from '@/lib/ws'
import { getChatSocket } from '@/lib/chat-ws'

describe('socket handshake credentials (FD-06 plumbing)', () => {
  it('tasks socket connects with withCredentials so the auth cookie rides every transport', () => {
    getSocket()
    const [, opts] = vi.mocked(io).mock.calls[0] as [string, { withCredentials?: boolean }]
    expect(opts.withCredentials).toBe(true)
  })

  it('chat socket connects with withCredentials so the auth cookie rides every transport', () => {
    getChatSocket()
    const calls = vi.mocked(io).mock.calls
    const [, opts] = calls[calls.length - 1] as [string, { withCredentials?: boolean }]
    expect(opts.withCredentials).toBe(true)
  })
})
