// SEC-08: UsersController must be gated by AuthGuard, and sensitive
// password/PIN columns must have select:false so they are never returned.
import 'reflect-metadata'
import { UsersController } from './users.controller'
import { AuthGuard } from '../auth/guards/auth.guard'
import { getMetadataArgsStorage } from 'typeorm'
import { User } from './entities/user.entity'

const GUARDS_METADATA = '__guards__'

describe('UsersController security (SEC-08)', () => {
  it('is protected by AuthGuard at the class level', () => {
    const guards: unknown[] | undefined = Reflect.getMetadata(GUARDS_METADATA, UsersController)
    expect(guards).toBeDefined()
    expect(guards!.some(g => g === AuthGuard)).toBe(true)
  })
})

describe('User entity column security (SEC-08)', () => {
  const cols = () => getMetadataArgsStorage().columns

  it('passwordHash column has select:false', () => {
    const col = cols().find(c => c.target === User && c.propertyName === 'passwordHash')
    expect(col).toBeDefined()
    expect(col!.options?.select).toBe(false)
  })

  it('securityPinHash column has select:false', () => {
    const col = cols().find(c => c.target === User && c.propertyName === 'securityPinHash')
    expect(col).toBeDefined()
    expect(col!.options?.select).toBe(false)
  })
})
