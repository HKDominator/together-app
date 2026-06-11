// BUG-27: WebSocket-only transport → no realtime behind proxies that block raw WS.
// Fix: include 'polling' as fallback so socket.io-client can negotiate downward.
import { describe, it, expect, vi } from 'vitest'

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({ on: vi.fn(), off: vi.fn(), disconnect: vi.fn() })),
}))

import { io }         from 'socket.io-client'
import { getSocket }  from '@/lib/ws'

describe('WebSocket transport config (BUG-27)', () => {
  it('lists websocket first then polling for graceful fallback', () => {
    getSocket()
    const mockIo = vi.mocked(io)
    const [, opts] = mockIo.mock.calls[0] as [string, { transports: string[] }]
    expect(opts.transports).toContain('websocket')
    expect(opts.transports).toContain('polling')
    expect(opts.transports.indexOf('websocket')).toBeLessThan(opts.transports.indexOf('polling'))
  })
})
