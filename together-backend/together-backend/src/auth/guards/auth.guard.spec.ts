// Unit tests for AuthGuard behaviour in a GraphQL execution context
// (SEC-01). The guard must read the request from the GraphQL context, not
// only from the HTTP context, so resolvers are protected like REST routes.
import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from './auth.guard'
import { PermissionsGuard } from './permissions.guard'

// A fake ExecutionContext that behaves like a GraphQL call: getType() is
// 'graphql' and the GraphQL context (arg index 2) carries { req }. The
// HTTP request is deliberately undefined — in a real GraphQL request the
// HTTP-adapter request is not the resolver request, so a guard that only
// reads switchToHttp() would see nothing.
function gqlContext(req: unknown): ExecutionContext {
  const gqlCtx = { req }
  return {
    getType: () => 'graphql',
    getArgs: () => [undefined, undefined, gqlCtx, undefined],
    getArgByIndex: (i: number) => (i === 2 ? gqlCtx : undefined),
    switchToHttp: () => ({ getRequest: () => undefined }),
    getHandler: () => () => {},
    getClass: () => class {},
  } as unknown as ExecutionContext
}

describe('AuthGuard in GraphQL context (SEC-01)', () => {
  const future = new Date(Date.now() + 60_000)
  const liveSession = { id: 's1', userId: 'u1', revoked: false, expiresAt: future, lastSeenAt: new Date() }
  const user = { id: 'u1', roles: [] }

  function makeGuard() {
    const users = { findOne: jest.fn().mockResolvedValue(user) }
    const sessions = { findOne: jest.fn().mockResolvedValue(liveSession), save: jest.fn() }
    const jwtUtil = { verifyAccess: jest.fn().mockReturnValue({ sub: 'u1', sid: 's1' }) }
    const cfg = { get: (_k: string, d?: string) => d }
    return new AuthGuard(users as any, sessions as any, jwtUtil as any, cfg as any)
  }

  it('authenticates a valid token carried on the GraphQL request', async () => {
    const guard = makeGuard()
    const req: any = { cookies: { together_access: 'TOK' }, headers: {} }
    await expect(guard.canActivate(gqlContext(req))).resolves.toBe(true)
    expect(req.user).toEqual(user)
  })
})

describe('PermissionsGuard in GraphQL context (SEC-01)', () => {
  function makeCtx(req: unknown, required: string[]) {
    const reflector = { getAllAndOverride: () => required } as unknown as Reflector
    return { guard: new PermissionsGuard(reflector), ctx: gqlContext(req) }
  }

  it('denies a GraphQL request when the user lacks the required permission', () => {
    const req: any = { user: { roles: [{ permissions: [{ name: 'task.read' }] }] } }
    const { guard, ctx } = makeCtx(req, ['task.delete'])
    expect(() => guard.canActivate(ctx)).toThrow(/Missing permission/)
  })

  it('allows a GraphQL request when the user has the required permission', () => {
    const req: any = { user: { roles: [{ permissions: [{ name: 'task.delete' }] }] } }
    const { guard, ctx } = makeCtx(req, ['task.delete'])
    expect(guard.canActivate(ctx)).toBe(true)
  })
})
