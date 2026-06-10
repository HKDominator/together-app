// SEC-09: StatsController must be gated by AuthGuard so task statistics
// are not accessible to unauthenticated callers.
import 'reflect-metadata'
import { StatsController } from './stats.controller'
import { AuthGuard } from '../auth/guards/auth.guard'

const GUARDS_METADATA = '__guards__'

describe('StatsController security (SEC-09)', () => {
  it('is protected by AuthGuard at the class level', () => {
    const guards: unknown[] | undefined = Reflect.getMetadata(GUARDS_METADATA, StatsController)
    expect(guards).toBeDefined()
    expect(guards!.some(g => g === AuthGuard)).toBe(true)
  })
})
