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

  // findUserForAuth() uses createQueryBuilder+addSelect so plain findOne() no
  // longer loads the select:false hash columns.  Mock the QB chain here.
  const mockQb = {
    addSelect:          jest.fn().mockReturnThis(),
    leftJoinAndSelect:  jest.fn().mockReturnThis(),
    where:              jest.fn().mockReturnThis(),
    getOne:             jest.fn(),
  }
  const users    = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(x => x), createQueryBuilder: jest.fn(() => mockQb) }
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
  const mailer = { send: jest.fn(), peek: jest.fn(), isDev: () => true, shouldEchoLoginCode: () => true } as unknown as MailerService

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
    mockQb.getOne.mockResolvedValueOnce(null)
    await expect(service.beginLogin('x@y.z', 'pw', { ip: '', userAgent: '' }))
      .rejects.toThrow('Invalid credentials')
  })

  it('beginLogin rejects bad password', async () => {
    mockQb.getOne.mockResolvedValueOnce({
      id: 'u1', email: 'x@y.z',
      passwordHash: await bcrypt.hash('rightpass', 4),
      roles: [],
    })
    await expect(service.beginLogin('x@y.z', 'WRONG', { ip: '', userAgent: '' }))
      .rejects.toThrow('Invalid credentials')
  })

  it('beginLogin returns OTP stage when 2FA on', async () => {
    mockQb.getOne.mockResolvedValueOnce({
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
    mockQb.getOne.mockResolvedValueOnce({
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

  // BUG-07: register() must set coupleRole (couple-relationship semantics)
  // separately from the RBAC `roles` relation — both must be populated.
  // BUG-37: register() must forward the real ip/userAgent to the first session.
  it('register() sets coupleRole distinct from RBAC roles, and forwards real session meta (BUG-07, BUG-37)', async () => {
    roles.findOne.mockResolvedValueOnce({ id: 'r1', name: 'user', permissions: [] })
    users.save.mockImplementationOnce(async (u: any) => ({ ...u, id: 'new-u', sessions: [] }))
    sessions.save.mockImplementationOnce(async (s: any) => ({ ...s, id: 'sess-1' }))

    await service.register(
      { email: 'new@test.com', password: 'password1234', name: 'New User' } as any,
      { ip: '1.2.3.4', userAgent: 'Mozilla/5.0' },
    )

    const saved = users.save.mock.calls[0][0] as any
    expect(saved.coupleRole).toBe('partner')      // couple-role (BUG-07)
    expect(Array.isArray(saved.roles)).toBe(true) // RBAC roles also populated

    const sess = sessions.save.mock.calls[0][0] as any
    expect(sess.ip).toBe('1.2.3.4')              // BUG-37: real IP, not ''
    expect(sess.userAgent).toBe('Mozilla/5.0')   // BUG-37: real UA, not ''
  })

  it('verifyPin increments the counter on a wrong PIN (drives toward the cap)', async () => {
    const row = {
      id: 'att-1', userId: 'u1', stage: 'pin',
      attempts: 0, expiresAt: new Date(Date.now() + 60_000),
    }
    attempts.findOne.mockResolvedValueOnce(row)
    mockQb.getOne.mockResolvedValueOnce({
      id: 'u1', securityPinHash: await bcrypt.hash('1234', 4),
    })

    await expect(service.verifyPin('att-1', '9999', { ip: '', userAgent: '' }))
      .rejects.toThrow(/invalid security pin/i)

    expect(row.attempts).toBe(1)
    expect(attempts.save).toHaveBeenCalledWith(expect.objectContaining({ attempts: 1 }))
    expect(attempts.delete).not.toHaveBeenCalled()
  })
})