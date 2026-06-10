// Destination: together-backend/src/auth/auth.service.spec.ts
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'
import { JwtUtil } from './jwt-util.service'
import { MailerService } from './mailer.service'
import { User } from '../users/entities/user.entity'
import { Role } from './entities/role.entity'
import { Session } from './entities/session.entity'
import { LoginAttempt } from './entities/login-attempt.entity'

describe('AuthService (unit)', () => {
  let service: AuthService

  const users    = { findOne: jest.fn(), save: jest.fn(),  create: jest.fn(x => x) }
  const roles    = { findOne: jest.fn() }
  const sessions = { save: jest.fn(s => ({ ...s, id: 'sess-1' })), create: jest.fn(x => x), findOne: jest.fn() }
  const attempts = { save: jest.fn(s => ({ ...s, id: 'att-1' })), create: jest.fn(x => x), findOne: jest.fn(), delete: jest.fn() }
  const jwtUtil = {
    signAccess: jest.fn(() => 'ACCESS_TOKEN'),
    signRefresh: jest.fn(() => 'REFRESH_TOKEN'),
    verifyAccess: jest.fn(),
    verifyRefresh: jest.fn(),
    accessTtl: 900, refreshTtl: 604800,
  } as unknown as JwtUtil
  const mailer = { send: jest.fn(), peek: jest.fn(), isDev: () => true } as unknown as MailerService

  beforeEach(async () => {
    jest.clearAllMocks()
    const mod = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User),         useValue: users },
        { provide: getRepositoryToken(Role),         useValue: roles },
        { provide: getRepositoryToken(Session),      useValue: sessions },
        { provide: getRepositoryToken(LoginAttempt), useValue: attempts },
        { provide: JwtUtil,        useValue: jwtUtil },
        { provide: MailerService,  useValue: mailer },
        { provide: ConfigService,  useValue: { get: (k: string, d?: string) => d } },
      ],
    }).compile()
    service = mod.get(AuthService)
  })

  it('beginLogin rejects unknown email', async () => {
    users.findOne.mockResolvedValueOnce(null)
    await expect(service.beginLogin('x@y.z', 'pw', { ip: '', userAgent: '' }))
      .rejects.toThrow('Invalid credentials')
  })

  it('beginLogin rejects bad password', async () => {
    users.findOne.mockResolvedValueOnce({
      id: 'u1', email: 'x@y.z',
      passwordHash: await bcrypt.hash('rightpass', 4),
      roles: [],
    })
    await expect(service.beginLogin('x@y.z', 'WRONG', { ip: '', userAgent: '' }))
      .rejects.toThrow('Invalid credentials')
  })

  it('beginLogin returns OTP stage when 2FA on', async () => {
    users.findOne.mockResolvedValueOnce({
      id: 'u1', email: 'x@y.z',
      passwordHash: await bcrypt.hash('rightpass', 4),
      twoFactorEnabled: true, threeFactorEnabled: false,
      roles: [],
    })
    const r = await service.beginLogin('x@y.z', 'rightpass', { ip: '', userAgent: '' })
    expect(r.stage).toBe('otp')
    expect((r as any).devOtp).toMatch(/^\d{6}$/)
  })

  it('beginLogin skips OTP when 2FA off', async () => {
    users.findOne.mockResolvedValueOnce({
      id: 'u1', email: 'x@y.z',
      passwordHash: await bcrypt.hash('rightpass', 4),
      twoFactorEnabled: false, threeFactorEnabled: false,
      roles: [],
    })
    const r = await service.beginLogin('x@y.z', 'rightpass', { ip: '', userAgent: '' })
    expect(r.stage).toBe('done')
    expect((r as any).result.accessToken).toBe('ACCESS_TOKEN')
  })

  // ── SEC-06: PIN brute-force cap ────────────────────────────────────
  it('verifyPin rejects and discards the attempt once the cap is reached', async () => {
    attempts.findOne.mockResolvedValueOnce({
      id: 'att-1', userId: 'u1', stage: 'pin',
      attempts: 5,                                  // already at the cap
      expiresAt: new Date(Date.now() + 60_000),
    })

    await expect(service.verifyPin('att-1', '1234', { ip: '', userAgent: '' }))
      .rejects.toThrow(/too many/i)

    expect(attempts.delete).toHaveBeenCalledWith('att-1')
    expect(users.findOne).not.toHaveBeenCalled()   // bailed before checking the PIN
  })

  it('verifyPin increments the counter on a wrong PIN (drives toward the cap)', async () => {
    const row = {
      id: 'att-1', userId: 'u1', stage: 'pin',
      attempts: 0, expiresAt: new Date(Date.now() + 60_000),
    }
    attempts.findOne.mockResolvedValueOnce(row)
    users.findOne.mockResolvedValueOnce({
      id: 'u1', securityPinHash: await bcrypt.hash('1234', 4),
    })

    await expect(service.verifyPin('att-1', '9999', { ip: '', userAgent: '' }))
      .rejects.toThrow(/invalid security pin/i)

    expect(row.attempts).toBe(1)
    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }))
    expect(attempts.delete).not.toHaveBeenCalled()
  })
})