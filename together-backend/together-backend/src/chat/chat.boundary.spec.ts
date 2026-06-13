// BUG-15/16: documents the Postgres ↔ Mongo boundary constraints.
//
// BUG-15: senderId is now always derived from the authenticated user
//   (SEC-04 closed the spoofing path). senderName/senderColor are
//   denormalised snapshots — they won't update if the user renames.
//   Orphan messages on user-delete are a known boundary (single-tenant).
//
// BUG-16: Mongo chat and Postgres operate as independent stores with no
//   distributed transaction. Acceptable for append-only chat: a failed
//   Mongo insert leaves no Postgres state inconsistent; the reverse is
//   not possible (chat doesn't mutate Postgres).
//
// These tests verify the correct authoritative-identity behaviour that
// replaced the old client-spoofable senderId.
import { ChatGateway } from './chat.gateway'

const makeGateway = (user: any) => {
  const chat   = { insert: jest.fn(async (d: any) => ({ ...d, id: 'm1', createdAt: 'now' })) } as any
  const wsAuth = { authenticate: jest.fn(async () => user) } as any
  const gw = new ChatGateway(chat, wsAuth)
  ;(gw as any).server = { to: jest.fn(() => ({ emit: jest.fn() })) }
  return { gw, chat }
}
const makeSocket = (userData?: any) => ({
  id: 'sock-1', data: { user: userData } as any,
  join: jest.fn(), disconnect: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
})

describe('ChatGateway — identity boundary (BUG-15/16)', () => {
  it('senderId in persisted message is always the authenticated user id', async () => {
    const user = { id: 'pg-uuid-1', name: 'Ana', avatarColor: '#C0392B' }
    const { gw, chat } = makeGateway(user)
    const sock = makeSocket(user)
    await gw.onSend({ body: 'hello' } as any, sock as any)
    expect(chat.insert).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: 'pg-uuid-1' }),
    )
  })

  it('senderName comes from the authenticated user, not the client payload', async () => {
    const user = { id: 'pg-uuid-1', name: 'Ana', avatarColor: '#C0392B' }
    const { gw, chat } = makeGateway(user)
    const sock = makeSocket(user)
    // Client tries to send with a different name — ignored
    await gw.onSend({ body: 'hi', senderId: 'SPOOFED', senderName: 'HACKER' } as any, sock as any)
    expect(chat.insert).toHaveBeenCalledWith(
      expect.objectContaining({ senderName: 'Ana' }),
    )
  })
})
