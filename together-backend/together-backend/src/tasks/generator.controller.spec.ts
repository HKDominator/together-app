// SEC-05: the generator endpoints (/tasks/generate/*) spawn/stop task
// generation and must not be reachable unauthenticated. They carry the same
// AuthGuard + PermissionsGuard wiring as the REST tasks controller, gated
// behind an admin-only permission so a random caller can't pollute data or
// exhaust resources.
import { GeneratorController } from './generator.controller'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator'

const GUARDS_METADATA = '__guards__'
const classGuards = (c: any): any[] => Reflect.getMetadata(GUARDS_METADATA, c) ?? []
const methodPerms = (c: any, m: string): string[] | undefined =>
  Reflect.getMetadata(PERMISSIONS_KEY, c.prototype[m])

describe('GeneratorController is guarded (SEC-05)', () => {
  it('applies AuthGuard + PermissionsGuard at the class level', () => {
    expect(classGuards(GeneratorController)).toEqual(
      expect.arrayContaining([AuthGuard, PermissionsGuard]),
    )
  })

  it('start / stop / status require an admin-only permission', () => {
    expect(methodPerms(GeneratorController, 'start')).toEqual(['task.delete'])
    expect(methodPerms(GeneratorController, 'stop')).toEqual(['task.delete'])
    expect(methodPerms(GeneratorController, 'status')).toEqual(['task.delete'])
  })
})
