// SEC-04: the tasks gateway broadcasts every task mutation to all connected
// sockets, so an unauthenticated client could eavesdrop on the couple's whole
// task stream. The handshake must be authenticated and unauthenticated
// clients dropped before they can receive any broadcast.
import { TasksGateway } from './tasks.gateway'

const makeGateway = (user: any) => {
  const wsAuth = { authenticate: jest.fn(async () => user) } as any
  const gateway = new TasksGateway(wsAuth)
  return { gateway, wsAuth }
}

const makeSocket = () => ({ id: 'sock-1', data: {} as any, disconnect: jest.fn() })

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
