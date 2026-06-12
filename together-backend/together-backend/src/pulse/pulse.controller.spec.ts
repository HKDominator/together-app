// Destination: together-backend/together-backend/src/pulse/pulse.controller.spec.ts
// Wave 5 Step 6 (FD-16 / ADR-0004): PulseController spec.
//
// Three groups:
//   1. Guard wiring — AuthGuard at class level, no PermissionsGuard
//      (Pulse has no permission rows; matches StatsController pattern).
//   2. UpsertCheckInDto — out-of-vocabulary mood/energy are rejected by
//      class-validator before the handler runs.
//   3. Endpoint delegation — both handlers pass caller id (from req.user.id,
//      never from the payload) and return the service's view unchanged.
import 'reflect-metadata'
import { Test, TestingModule } from '@nestjs/testing'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import type { Request } from 'express'
import { PulseController } from './pulse.controller'
import { PulseService } from './pulse.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { UpsertCheckInDto } from './dto/upsert-check-in.dto'
import type { PulseTodayView } from './pulse.service'

const GUARDS_METADATA = '__guards__'

const makeView = (): PulseTodayView => ({
  pulseDay: '2026-06-12',
  you:      { mood: 'bright', energy: 'charged' },
  partner:  { name: 'Dan', hasCheckedIn: false, checkIn: null },
})

const mockReq = (userId = 'u-1') =>
  ({ user: { id: userId } }) as unknown as Request & { user: { id: string } }

// ── 1. Guard wiring ──────────────────────────────────────────────────────────

describe('PulseController — guard wiring', () => {
  it('is protected by AuthGuard at the class level', () => {
    const guards: unknown[] | undefined = Reflect.getMetadata(GUARDS_METADATA, PulseController)
    expect(guards).toBeDefined()
    expect(guards!.some(g => g === AuthGuard)).toBe(true)
  })

  it('does NOT apply PermissionsGuard (no permission rows for Pulse)', () => {
    const guards: unknown[] | undefined = Reflect.getMetadata(GUARDS_METADATA, PulseController)
    expect(guards?.some(g => g === PermissionsGuard)).toBeFalsy()
  })
})

// ── 2. DTO vocabulary validation ─────────────────────────────────────────────

describe('UpsertCheckInDto — vocabulary validation', () => {
  it('accepts a valid mood + energy pair', async () => {
    const dto = plainToInstance(UpsertCheckInDto, { mood: 'bright', energy: 'charged' })
    expect(await validate(dto)).toHaveLength(0)
  })

  it('accepts all four moods', async () => {
    for (const mood of ['bright', 'steady', 'tender', 'heavy']) {
      const dto = plainToInstance(UpsertCheckInDto, { mood, energy: 'steady' })
      expect(await validate(dto)).toHaveLength(0)
    }
  })

  it('accepts all three energies', async () => {
    for (const energy of ['charged', 'steady', 'low']) {
      const dto = plainToInstance(UpsertCheckInDto, { mood: 'steady', energy })
      expect(await validate(dto)).toHaveLength(0)
    }
  })

  it('rejects an out-of-vocabulary mood', async () => {
    const dto = plainToInstance(UpsertCheckInDto, { mood: 'happy', energy: 'charged' })
    const errors = await validate(dto)
    expect(errors.some(e => e.property === 'mood')).toBe(true)
  })

  it('rejects an out-of-vocabulary energy', async () => {
    const dto = plainToInstance(UpsertCheckInDto, { mood: 'bright', energy: 'electric' })
    const errors = await validate(dto)
    expect(errors.some(e => e.property === 'energy')).toBe(true)
  })

  it('rejects missing mood and energy', async () => {
    const dto = plainToInstance(UpsertCheckInDto, {})
    const errors = await validate(dto)
    expect(errors.length).toBeGreaterThan(0)
  })
})

// ── 3. Endpoint delegation ───────────────────────────────────────────────────

describe('PulseController — endpoint delegation', () => {
  let controller: PulseController
  let service:    jest.Mocked<PulseService>

  beforeEach(async () => {
    const mock = {
      getToday:      jest.fn(),
      upsertCheckIn: jest.fn(),
    } as unknown as jest.Mocked<PulseService>

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PulseController],
      providers:   [{ provide: PulseService, useValue: mock }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .compile()

    controller = module.get(PulseController)
    service    = module.get(PulseService) as jest.Mocked<PulseService>
  })

  it('GET today — delegates to getToday with caller id', async () => {
    const view = makeView()
    service.getToday.mockResolvedValue(view)
    const result = await controller.getToday(mockReq('u-1'))
    expect(service.getToday).toHaveBeenCalledWith('u-1')
    expect(result).toBe(view)
  })

  it('GET today — uses req.user.id, not a hard-coded id', async () => {
    service.getToday.mockResolvedValue(makeView())
    await controller.getToday(mockReq('u-99'))
    expect(service.getToday).toHaveBeenCalledWith('u-99')
  })

  it('PUT check-in — delegates to upsertCheckIn with caller id + dto', async () => {
    const view = makeView()
    service.upsertCheckIn.mockResolvedValue(view)
    const dto = plainToInstance(UpsertCheckInDto, { mood: 'steady', energy: 'low' })
    const result = await controller.checkIn(dto, mockReq('u-2'))
    expect(service.upsertCheckIn).toHaveBeenCalledWith('u-2', dto)
    expect(result).toBe(view)
  })

  it('PUT check-in — returns the freshly built today view', async () => {
    const view = makeView()
    service.upsertCheckIn.mockResolvedValue(view)
    const dto = plainToInstance(UpsertCheckInDto, { mood: 'heavy', energy: 'low' })
    const result = await controller.checkIn(dto, mockReq('u-1'))
    expect(result).toBe(view)
  })
})
