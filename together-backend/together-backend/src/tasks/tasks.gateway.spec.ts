// SEC-04: the tasks gateway broadcasts every task mutation to all connected
// sockets, so an unauthenticated client could eavesdrop on the couple's whole
// task stream. The handshake must be authenticated and unauthenticated
// clients dropped before they can receive any broadcast.
import { TasksGateway } from './tasks.gateway'
import { PresenceService } from '../presence/presence.service'

const makeGateway = (user: any) => {
  const wsAuth   = { authenticate: jest.fn(async () => user) } as any
  const presence = new PresenceService()
  const server   = { emit: jest.fn() } as any
  const gateway  = new TasksGateway(wsAuth, presence)
  gateway.server = server
  gateway.afterInit(server)
  return { gateway, wsAuth, presence, server }
}

const makeSocket = (id = 'sock-1') =>
  ({ id, data: {} as any, disconnect: jest.fn(), emit: jest.fn() })

describe('TasksGateway connection auth (SEC-04)', () => {
  it('disconnects an unauthenticated client', async () => {
    const { gateway } = makeGateway(null)
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    expect(client.disconnect).toHaveBeenCalled()
  })

  it('keeps an authenticated client connected', async () => {
    const { gateway } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    expect(client.disconnect).not.toHaveBeenCalled()
  })
})

// FD-06: the gateway is the transport for dual-presence — every authenticated
// socket is registered with PresenceService, seeded with a full snapshot
// (events are not replayed on reconnect, so the snapshot is the only
// trustworthy seed), and announced to the rest of the workspace.
describe('TasksGateway presence (FD-06)', () => {
  it('seeds an authenticated client with presence:state and announces them online', async () => {
    const { gateway, server } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket()

    await gateway.handleConnection(client as any)

    expect(client.emit).toHaveBeenCalledWith(
      'presence:state',
      expect.objectContaining({ online: ['u1'] }),
    )
    expect(server.emit).toHaveBeenCalledWith('presence:online', { userId: 'u1' })
  })

  it('a rejected client gets no snapshot and is never announced', async () => {
    const { gateway, server } = makeGateway(null)
    const client = makeSocket()

    await gateway.handleConnection(client as any)

    expect(client.emit).not.toHaveBeenCalled()
    expect(server.emit).not.toHaveBeenCalled()
  })

  it('announces offline after the grace period once the client disconnects', async () => {
    jest.useFakeTimers()
    try {
      const { gateway, server } = makeGateway({ id: 'u1', name: 'Ana' })
      const client = makeSocket()
      await gateway.handleConnection(client as any)
      server.emit.mockClear()

      gateway.handleDisconnect(client as any)
      jest.runAllTimers()

      expect(server.emit).toHaveBeenCalledWith('presence:offline', { userId: 'u1' })
    } finally {
      jest.useRealTimers()
    }
  })

  it('relays a client’s viewing focus with the identity taken from the socket, not the payload', async () => {
    const { gateway, server } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    server.emit.mockClear()

    gateway.onViewing({ taskId: 't1', userId: 'u2-spoofed' } as any, client as any)

    expect(server.emit).toHaveBeenCalledWith('presence:viewing', { userId: 'u1', taskId: 't1' })
  })

  it('treats an offline-created temp id as no focus — there is no shared record to co-view (BUG-25 guard)', async () => {
    const { gateway, server } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    gateway.onViewing({ taskId: 't1' } as any, client as any)
    server.emit.mockClear()

    gateway.onViewing({ taskId: 'tmp_123_abc' } as any, client as any)

    expect(server.emit).toHaveBeenCalledWith('presence:viewing', { userId: 'u1', taskId: null })
  })

  it('ignores viewing messages from a socket with no authenticated user', () => {
    const { gateway, server } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket() // handleConnection never ran

    gateway.onViewing({ taskId: 't1' } as any, client as any)

    expect(server.emit).not.toHaveBeenCalled()
  })

  // presence-resync: a client whose presence provider remounts onto an
  // already-live socket (navigating back from a route outside the app shell)
  // missed the connect-time snapshot. It can re-request the current state; the
  // gateway replies to that socket only — a re-seed, not a broadcast.
  it('replies with the current presence:state snapshot to a client that requests a resync', async () => {
    const { gateway } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket()
    await gateway.handleConnection(client as any)
    client.emit.mockClear()

    gateway.onSync(client as any)

    expect(client.emit).toHaveBeenCalledWith(
      'presence:state',
      expect.objectContaining({ online: ['u1'] }),
    )
  })

  it('ignores a resync request from a socket with no authenticated user', () => {
    const { gateway } = makeGateway({ id: 'u1', name: 'Ana' })
    const client = makeSocket() // handleConnection never ran

    gateway.onSync(client as any)

    expect(client.emit).not.toHaveBeenCalled()
  })
})
