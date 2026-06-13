// Destination: together-backend/together-backend/src/pulse/pulse.service.spec.ts
// Wave 5 Step 4 (FD-16 / ADR-0004): data model + PulseService core.
//
// Service-seam specs with mocked repositories (house pattern from
// tasks.service.spec.ts). Covers: Pulse Day computation in the
// deployment timezone (DST both ways — the BUG-05 lesson), today-only
// upsert semantics including the unique-constraint race path, and the
// four-state today view with Reveal-after-you-share enforced in the
// service layer — the partner's check-in *fact* is always visible, the
// *content* stays null until the caller has checked in, and a solo day
// has no reading/suggestion fields at all (absence, never a partial).
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ConfigService } from '@nestjs/config'
import { PulseService } from './pulse.service'
import { PulseSuggestionService } from './pulse-suggestion.service'
import { PulseCheckIn } from './entities/pulse-check-in.entity'
import { PulseDay } from './entities/pulse-day.entity'
import { pulseDayFor } from './pulse-day.util'
import { UsersService } from '../users/users.service'

const ANA = { id: 'u-1', name: 'Ana', coupleRole: 'owner' }
const DAN = { id: 'u-2', name: 'Dan', coupleRole: 'partner' }

const NOON_UTC = new Date('2026-06-12T12:00:00Z') // 15:00 in Europe/Bucharest
const TODAY    = '2026-06-12'

const makeRow = (over: Partial<PulseCheckIn> = {}): PulseCheckIn => ({
  id: 'ci-1', userId: ANA.id, pulseDay: TODAY,
  mood: 'steady', energy: 'steady',
  createdAt: new Date(), updatedAt: new Date(),
  ...over,
} as PulseCheckIn)

describe('pulseDayFor — Pulse Day boundary in the deployment timezone', () => {
  it('keeps a late evening on the same local day (summer, UTC+3)', () => {
    expect(pulseDayFor(new Date('2026-06-12T20:59:00Z'), 'Europe/Bucharest')).toBe('2026-06-12')
  })
  it('rolls over at local midnight, not UTC midnight (summer, UTC+3)', () => {
    expect(pulseDayFor(new Date('2026-06-12T21:01:00Z'), 'Europe/Bucharest')).toBe('2026-06-13')
  })
  it('keeps a late evening on the same local day (winter, UTC+2)', () => {
    expect(pulseDayFor(new Date('2026-01-15T21:59:00Z'), 'Europe/Bucharest')).toBe('2026-01-15')
  })
  it('rolls over at local midnight in winter time too', () => {
    expect(pulseDayFor(new Date('2026-01-15T22:01:00Z'), 'Europe/Bucharest')).toBe('2026-01-16')
  })
})

describe('PulseService (unit, mocked repos)', () => {
  let service:  PulseService
  let checkIns: { findOne: jest.Mock; find: jest.Mock; save: jest.Mock; create: jest.Mock }
  let days:     { findOne: jest.Mock }
  let suggestions: { ensureSuggestion: jest.Mock; repairSuggestion: jest.Mock }

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOON_UTC)

    checkIns = {
      findOne: jest.fn().mockResolvedValue(null),
      find:    jest.fn().mockResolvedValue([]),
      save:    jest.fn().mockImplementation(async (v: Partial<PulseCheckIn>) => ({ id: 'ci-new', ...v })),
      create:  jest.fn().mockImplementation((v: Partial<PulseCheckIn>) => v),
    }
    days = { findOne: jest.fn().mockResolvedValue(null) }
    suggestions = {
      ensureSuggestion: jest.fn().mockResolvedValue(null),
      repairSuggestion: jest.fn().mockResolvedValue(null),
    }

    const usersMock = {
      findAll: jest.fn().mockResolvedValue([ANA, DAN]),
    }
    const cfgMock = {
      get: jest.fn().mockImplementation((key: string, fallback?: string) =>
        key === 'PULSE_TIMEZONE' ? 'Europe/Bucharest' : fallback),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PulseService,
        { provide: getRepositoryToken(PulseCheckIn), useValue: checkIns },
        { provide: getRepositoryToken(PulseDay),     useValue: days },
        { provide: PulseSuggestionService,           useValue: suggestions },
        { provide: UsersService,                     useValue: usersMock },
        { provide: ConfigService,                    useValue: cfgMock },
      ],
    }).compile()

    service = module.get(PulseService)
  })

  afterEach(() => { jest.useRealTimers() })

  // ── Upsert semantics ───────────────────────────────────────────────

  describe('upsertCheckIn', () => {
    it("creates today's row when the caller has not checked in yet", async () => {
      // The store reflects the save, so the returned view reads the
      // persisted row rather than echoing the input.
      checkIns.save.mockImplementation(async (v: Partial<PulseCheckIn>) => {
        const row = { id: 'ci-new', ...v } as PulseCheckIn
        checkIns.find.mockResolvedValue([row])
        return row
      })

      const view = await service.upsertCheckIn(ANA.id, { mood: 'bright', energy: 'charged' })

      expect(checkIns.save).toHaveBeenCalledWith(expect.objectContaining({
        userId: ANA.id, pulseDay: TODAY, mood: 'bright', energy: 'charged',
      }))
      expect(view.you).toEqual({ mood: 'bright', energy: 'charged' })
    })

    it("updates the caller's existing row for today instead of adding a second one", async () => {
      checkIns.findOne.mockResolvedValueOnce(makeRow({ mood: 'steady' }))

      await service.upsertCheckIn(ANA.id, { mood: 'tender', energy: 'low' })

      expect(checkIns.save).toHaveBeenCalledTimes(1)
      expect(checkIns.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 'ci-1', userId: ANA.id, pulseDay: TODAY, mood: 'tender', energy: 'low',
      }))
    })

    it('recovers from the unique-constraint race by updating the row that won', async () => {
      // findOne sees nothing, the insert loses the (userId, pulseDay)
      // unique race, the retry finds the winner and updates it.
      checkIns.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeRow({ id: 'ci-winner', mood: 'steady' }))
      checkIns.save
        .mockRejectedValueOnce({ driverError: { code: '23505' } })
        .mockImplementation(async (v: Partial<PulseCheckIn>) => v as PulseCheckIn)

      await service.upsertCheckIn(ANA.id, { mood: 'heavy', energy: 'low' })

      expect(checkIns.save).toHaveBeenLastCalledWith(expect.objectContaining({
        id: 'ci-winner', mood: 'heavy', energy: 'low',
      }))
    })

    it('rethrows non-unique-violation errors untouched', async () => {
      checkIns.save.mockRejectedValueOnce({ driverError: { code: '42P01' } })

      await expect(
        service.upsertCheckIn(ANA.id, { mood: 'steady', energy: 'steady' }),
      ).rejects.toEqual({ driverError: { code: '42P01' } })
    })

    it("only ever writes the current Pulse Day — past days are immutable by construction", async () => {
      await service.upsertCheckIn(ANA.id, { mood: 'bright', energy: 'steady' })
      expect(checkIns.findOne).toHaveBeenCalledWith({ where: { userId: ANA.id, pulseDay: TODAY } })

      // The clock rolls past local midnight: the same call now targets
      // the new Pulse Day; yesterday's row is never looked up again.
      jest.setSystemTime(new Date('2026-06-12T21:30:00Z')) // 00:30 local, June 13
      await service.upsertCheckIn(ANA.id, { mood: 'steady', energy: 'low' })

      expect(checkIns.findOne).toHaveBeenCalledWith({ where: { userId: ANA.id, pulseDay: '2026-06-13' } })
      expect(checkIns.save).toHaveBeenLastCalledWith(expect.objectContaining({ pulseDay: '2026-06-13' }))
    })
  })

  // ── The four-state today view (Reveal-after-you-share) ────────────

  describe('getToday — four states', () => {
    it('(a) nobody yet: empty form state, partner fact false, no reading keys', async () => {
      const view = await service.getToday(ANA.id)

      expect(view.pulseDay).toBe(TODAY)
      expect(view.you).toBeNull()
      expect(view.partner).toEqual({ name: 'Dan', hasCheckedIn: false, checkIn: null })
      expect(view).not.toHaveProperty('reading')
      expect(view).not.toHaveProperty('suggestion')
    })

    it("(b) partner first: the fact is visible, the content is structurally absent", async () => {
      checkIns.find.mockResolvedValue([makeRow({ id: 'ci-2', userId: DAN.id, mood: 'bright', energy: 'charged' })])

      const view = await service.getToday(ANA.id)

      expect(view.you).toBeNull()
      expect(view.partner.hasCheckedIn).toBe(true)
      expect(view.partner.checkIn).toBeNull()
      // Structural privacy: the partner's values appear nowhere in the
      // serialized view, so no client bug can leak them pre-reveal.
      expect(JSON.stringify(view)).not.toContain('bright')
      expect(JSON.stringify(view)).not.toContain('charged')
      expect(view).not.toHaveProperty('reading')
      expect(view).not.toHaveProperty('suggestion')
    })

    it('(c) solo: own check-in present, warm absence — no reading or suggestion fields', async () => {
      checkIns.find.mockResolvedValue([makeRow({ userId: ANA.id, mood: 'tender', energy: 'low' })])

      const view = await service.getToday(ANA.id)

      expect(view.you).toEqual({ mood: 'tender', energy: 'low' })
      expect(view.partner).toEqual({ name: 'Dan', hasCheckedIn: false, checkIn: null })
      expect(view).not.toHaveProperty('reading')
      expect(view).not.toHaveProperty('suggestion')
    })

    it('(d) both in: content revealed, Reading computed live from the pair', async () => {
      checkIns.find.mockResolvedValue([
        makeRow({ id: 'ci-1', userId: ANA.id, mood: 'heavy',  energy: 'steady' }),
        makeRow({ id: 'ci-2', userId: DAN.id, mood: 'tender', energy: 'low' }),
      ])

      const view = await service.getToday(ANA.id)

      expect(view.you).toEqual({ mood: 'heavy', energy: 'steady' })
      expect(view.partner.checkIn).toEqual({ mood: 'tender', energy: 'low' })
      expect(view.reading).toEqual({ key: 'carrying-it-together', label: 'Carrying it together' })
    })

    it('(d) returns the stored suggestion text and nothing about its provenance', async () => {
      checkIns.find.mockResolvedValue([
        makeRow({ id: 'ci-1', userId: ANA.id }),
        makeRow({ id: 'ci-2', userId: DAN.id }),
      ])
      days.findOne.mockResolvedValue({
        id: 'pd-1', pulseDay: TODAY,
        suggestionText: 'Tea on the balcony, phones inside.',
        suggestionSource: 'canon', canonEntryId: 'quiet-balcony-tea',
        readingAtGeneration: 'in-step', generatedAt: new Date(),
      })

      const view = await service.getToday(ANA.id)

      expect(view.suggestion).toBe('Tea on the balcony, phones inside.')
      // Invisible degradation: provenance never reaches the client.
      const json = JSON.stringify(view)
      expect(json).not.toContain('suggestionSource')
      expect(json).not.toContain('canonEntryId')
      expect(json).not.toContain('quiet-balcony-tea')
    })

    it('(d) with no stored row: lazy-repairs with the Canon pick — the slot is never empty on a completed day', async () => {
      checkIns.find.mockResolvedValue([
        makeRow({ id: 'ci-1', userId: ANA.id }),
        makeRow({ id: 'ci-2', userId: DAN.id }),
      ])
      suggestions.repairSuggestion.mockResolvedValue({
        id: 'pd-repaired', pulseDay: TODAY,
        suggestionText: 'Shoulder to shoulder doing nothing in particular. It counts.',
        suggestionSource: 'canon', canonEntryId: 'step-nothing-counts',
        readingAtGeneration: 'in-step', generatedAt: new Date(),
      })

      const view = await service.getToday(ANA.id)

      expect(suggestions.repairSuggestion).toHaveBeenCalledWith(TODAY, 'in-step')
      expect(view.suggestion).toBe('Shoulder to shoulder doing nothing in particular. It counts.')
    })

    it('(d) with a stored row: serves it without invoking repair', async () => {
      checkIns.find.mockResolvedValue([
        makeRow({ id: 'ci-1', userId: ANA.id }),
        makeRow({ id: 'ci-2', userId: DAN.id }),
      ])
      days.findOne.mockResolvedValue({
        id: 'pd-1', pulseDay: TODAY, suggestionText: 'Stored already.',
        suggestionSource: 'llm', canonEntryId: 'step-crossword',
        readingAtGeneration: 'in-step', generatedAt: new Date(),
      })

      const view = await service.getToday(ANA.id)

      expect(view.suggestion).toBe('Stored already.')
      expect(suggestions.repairSuggestion).not.toHaveBeenCalled()
    })

    it('solo and empty days never touch the suggestion pipeline', async () => {
      await service.getToday(ANA.id) // empty
      checkIns.find.mockResolvedValue([makeRow({ userId: ANA.id })])
      await service.getToday(ANA.id) // solo

      expect(suggestions.repairSuggestion).not.toHaveBeenCalled()
      expect(suggestions.ensureSuggestion).not.toHaveBeenCalled()
    })
  })

  // ── Generation trigger: the write that completes the day ──────────

  describe('upsertCheckIn — suggestion generation trigger', () => {
    it('awaits ensureSuggestion when the write completes the day, with the full context', async () => {
      checkIns.findOne
        .mockResolvedValueOnce(null) // own row: create path
        .mockResolvedValueOnce(makeRow({ id: 'ci-2', userId: DAN.id, mood: 'tender', energy: 'low' }))

      await service.upsertCheckIn(ANA.id, { mood: 'heavy', energy: 'steady' })

      expect(suggestions.ensureSuggestion).toHaveBeenCalledTimes(1)
      expect(suggestions.ensureSuggestion).toHaveBeenCalledWith({
        pulseDay: TODAY,
        reading:  'carrying-it-together',
        partners: expect.arrayContaining([
          { name: 'Ana', mood: 'heavy',  energy: 'steady' },
          { name: 'Dan', mood: 'tender', energy: 'low' },
        ]),
      })
    })

    it('does not generate on the first check-in of the day', async () => {
      await service.upsertCheckIn(ANA.id, { mood: 'bright', energy: 'charged' })

      expect(suggestions.ensureSuggestion).not.toHaveBeenCalled()
    })

    it('frames the view for whoever calls — Dan sees Ana as the partner', async () => {
      checkIns.find.mockResolvedValue([makeRow({ userId: ANA.id, mood: 'bright', energy: 'charged' })])

      const view = await service.getToday(DAN.id)

      expect(view.you).toBeNull()
      expect(view.partner.name).toBe('Ana')
      expect(view.partner.hasCheckedIn).toBe(true)
      expect(view.partner.checkIn).toBeNull()
    })
  })
})
