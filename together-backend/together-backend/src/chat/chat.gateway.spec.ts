// SEC-04: the chat gateway must authenticate the socket handshake, reject
// unauthenticated clients, and derive the sender identity from the
// authenticated user — never from the client-supplied payload (sender
// spoofing). It must also bound message length.
import { ChatGateway } from './chat.gateway'

const makeGateway = (user: any) => {
  const chat = { insert: jest.fn(async (d: any) => ({ ...d, id: 'm1', createdAt: 'now' })) } as any
  const wsAuth = { authenticate: jest.fn(async () => user) } as any
  const gateway = new ChatGateway(chat, wsAuth)
  ;(gateway as any).server = { to: jest.fn(() => ({ emit: jest.fn() })) }
  return { gateway, chat, wsAuth }
}

const makeSocket = () => ({
  id: 'sock-1',
  data: {} as any,
  join: jest.fn(),
  disconnect: jest.fn(),
  to: jest.fn(() => ({ emit: jest.fn() })),
})

describe('ChatGateway auth + anti-spoof (SEC-04)', () => {
  it('disconnects and does not join the room when the handshake is unauthenticated', async () => {
    const { gateway } = makeGateway(null)
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    expect(client.disconnect).toHaveBeenCalled()
    expect(client.join).not.toHaveBeenCalled()
  })

  it('joins the workspace room and stores the user when authenticated', async () => {
    const user = { id: 'u1', name: 'Ana', avatarColor: '#abc' }
    const { gateway } = makeGateway(user)
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    expect(client.disconnect).not.toHaveBeenCalled()
    expect(client.join).toHaveBeenCalledWith('workspace')
    expect(client.data.user).toBe(user)
  })

  it('uses the authenticated user id as senderId, ignoring a spoofed payload', async () => {
    const user = { id: 'u1', name: 'Ana', avatarColor: '#abc' }
    const { gateway, chat } = makeGateway(user)
    const client = makeSocket()
    client.data.user = user

    await gateway.onSend(
      { roomId: 'workspace', senderId: 'VICTIM', senderName: 'Dan', body: 'hi' } as any,
      client as any,
    )

    expect(chat.insert).toHaveBeenCalledWith(
      expect.objectContaining({ senderId: 'u1', senderName: 'Ana' }),
    )
  })

  it('bounds the message body length', async () => {
    const user = { id: 'u1', name: 'Ana', avatarColor: '#abc' }
    const { gateway, chat } = makeGateway(user)
    const client = makeSocket()
    client.data.user = user

    await gateway.onSend({ body: 'x'.repeat(10_000) } as any, client as any)

    const persisted = chat.insert.mock.calls[0][0].body
    expect(persisted.length).toBeLessThanOrEqual(4000)
  })

  it('disconnects an unauthenticated socket that tries to send', async () => {
    const { gateway, chat } = makeGateway(null)
    const client = makeSocket()
    await gateway.onSend({ body: 'hi' } as any, client as any)
    expect(client.disconnect).toHaveBeenCalled()
    expect(chat.insert).not.toHaveBeenCalled()
  })
})
