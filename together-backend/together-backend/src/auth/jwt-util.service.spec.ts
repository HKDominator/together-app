// SEC-03: the app must fail fast on boot when JWT_SECRET is missing or is the
// in-repo placeholder, so it can never silently sign/verify tokens with a
// publicly-known secret (which would let anyone forge an admin token).
import { JwtUtil } from './jwt-util.service'

const cfgFrom = (env: Record<string, string | undefined>) => ({
  get: <T = string>(key: string, def?: T): T =>
    (env[key] as unknown as T) ?? (def as T),
})

describe('JwtUtil secret validation (SEC-03)', () => {
  it('throws on construction when JWT_SECRET is unset', () => {
    expect(() => new JwtUtil(cfgFrom({}) as any)).toThrow(/JWT_SECRET/)
  })

  it('throws when JWT_SECRET is the in-repo placeholder', () => {
    expect(() =>
      new JwtUtil(cfgFrom({ JWT_SECRET: 'dev-only-secret-change-me' }) as any),
    ).toThrow(/JWT_SECRET/)
  })

  it('signs and verifies a round-trip with a real secret', () => {
    const jwt = new JwtUtil(cfgFrom({ JWT_SECRET: 's3cret-with-enough-entropy' }) as any)
    const token = jwt.signAccess({ sub: 'u1', sid: 'sess-1', roles: ['user'] })
    const claims = jwt.verifyAccess(token)
    expect(claims).toMatchObject({ sub: 'u1', sid: 'sess-1', typ: 'access' })
  })

  it('rejects tokens signed with a non-HS256 algorithm (VERIFY-01)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rawJwt = require('jsonwebtoken')
    const secret = 's3cret-with-enough-entropy'
    const jwtUtil = new JwtUtil(cfgFrom({ JWT_SECRET: secret }) as any)
    const hs384Token = rawJwt.sign(
      { sub: 'u1', sid: 's1', typ: 'access', roles: [] },
      secret,
      { algorithm: 'HS384' },
    )
    expect(() => jwtUtil.verifyAccess(hs384Token)).toThrow()
  })
})
