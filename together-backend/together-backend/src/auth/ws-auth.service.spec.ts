// SEC-04: WebSocket handshakes must be authenticated with the same access
// token the REST layer uses. WsAuthService verifies the access cookie (or a
// Bearer token in the socket auth payload), checks the session, and returns
// the User — so gateways can derive identity server-side instead of trusting
// a client-supplied senderId.
import { WsAuthService } from './ws-auth.service'
import { ACCESS_COOKIE } from './guards/auth.guard'

const make = () => {
  const jwtUtil = { verifyAccess: jest.fn() } as any
  const sessions = { findOne: jest.fn() } as any
  const users = { findOne: jest.fn() } as any
  const svc = new WsAuthService(users, sessions, jwtUtil)
  return { svc, jwtUtil, sessions, users }
}

const socket = (opts: { cookie?: string; auth?: any } = {}) =>
  ({ handshake: { headers: opts.cookie ? { cookie: opts.cookie } : {}, auth: opts.auth ?? {} } }) as any

describe('WsAuthService (SEC-04)', () => {
  it('returns null when the handshake carries no token', async () => {
    const { svc } = make()
    expect(await svc.authenticate(socket())).toBeNull()
  })

  it('returns the user for a valid access cookie', async () => {
    const { svc, jwtUtil, sessions, users } = make()
    jwtUtil.verifyAccess.mockReturnValue({ sub: 'u1', sid: 'sess-1', typ: 'access' })
    sessions.findOne.mockResolvedValue({
      id: 'sess-1', userId: 'u1', revoked: false,
      expiresAt: new Date(Date.now() + 60_000),
    })
    users.findOne.mockResolvedValue({ id: 'u1', name: 'Ana' })

    const user = await svc.authenticate(socket({ cookie: `${ACCESS_COOKIE}=GOODTOKEN` }))
    expect(user).toMatchObject({ id: 'u1', name: 'Ana' })
    expect(jwtUtil.verifyAccess).toHaveBeenCalledWith('GOODTOKEN')
  })

  it('returns null when the session is revoked', async () => {
    const { svc, jwtUtil, sessions, users } = make()
    jwtUtil.verifyAccess.mockReturnValue({ sub: 'u1', sid: 'sess-1', typ: 'access' })
    sessions.findOne.mockResolvedValue({
      id: 'sess-1', userId: 'u1', revoked: true,
      expiresAt: new Date(Date.now() + 60_000),
    })

    expect(await svc.authenticate(socket({ cookie: `${ACCESS_COOKIE}=GOODTOKEN` }))).toBeNull()
    expect(users.findOne).not.toHaveBeenCalled()
  })
})
