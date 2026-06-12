// Destination: together-app-ui/__tests__/pulse.test.ts
// Wave 5 Step 8 (FD-16 / ADR-0004): FE data layer spec.
//
// Covers:
//   1. derivePulseView — all four state mappings (empty / partner-first /
//      solo / complete) from the raw PulseTodayView server shape.
//   2. pulseApi.getToday — calls GET /pulse/today, parses response,
//      retries once after 401 (matches api.ts single-flight pattern).
//   3. pulseApi.upsertCheckIn — calls PUT /pulse/today/check-in with the
//      DTO body, returns the freshly built today view.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { pulseApi, derivePulseView } from '@/lib/pulse'
import type { PulseTodayView } from '@/lib/pulse'

afterEach(() => { vi.restoreAllMocks() })

// ── helpers ───────────────────────────────────────────────────────────

const makeView = (over: Partial<PulseTodayView> = {}): PulseTodayView => ({
  pulseDay: '2026-06-12',
  you:      null,
  partner:  { name: 'Dan', hasCheckedIn: false, checkIn: null },
  ...over,
})

const stubFetch = (body: unknown, status = 200) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), { status }),
  ))

// ── 1. derivePulseView ────────────────────────────────────────────────

describe('derivePulseView — four-state mapping', () => {
  it('empty when neither partner has checked in', () => {
    expect(derivePulseView(makeView())).toBe('empty')
  })

  it('partner-first when partner checked in but you have not', () => {
    const view = makeView({ partner: { name: 'Dan', hasCheckedIn: true, checkIn: null } })
    expect(derivePulseView(view)).toBe('partner-first')
  })

  it('solo when you checked in but partner has not', () => {
    const view = makeView({ you: { mood: 'bright', energy: 'charged' } })
    expect(derivePulseView(view)).toBe('solo')
  })

  it('complete when both have checked in (reading present)', () => {
    const view = makeView({
      you:      { mood: 'bright', energy: 'charged' },
      partner:  { name: 'Dan', hasCheckedIn: true, checkIn: { mood: 'steady', energy: 'low' } },
      reading:  { key: 'in-step', label: 'In step' },
    })
    expect(derivePulseView(view)).toBe('complete')
  })

  it('complete even when reading is absent (degraded fallback)', () => {
    const view = makeView({
      you:     { mood: 'heavy', energy: 'low' },
      partner: { name: 'Dan', hasCheckedIn: true, checkIn: { mood: 'heavy', energy: 'low' } },
    })
    expect(derivePulseView(view)).toBe('complete')
  })
})

// ── 2. pulseApi.getToday ──────────────────────────────────────────────

describe('pulseApi.getToday', () => {
  it('sends GET /pulse/today with credentials and returns parsed view', async () => {
    const view = makeView({ you: { mood: 'steady', energy: 'low' } })
    stubFetch(view)
    const result = await pulseApi.getToday()
    expect(result).toEqual(view)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/pulse/today'),
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    )
  })

  it('retries once after a 401 (same single-flight pattern as api.ts)', async () => {
    const view  = makeView()
    let calls   = 0
    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/auth/refresh')) {
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      return Promise.resolve(
        new Response(
          ++calls === 1 ? 'Unauthorized' : JSON.stringify(view),
          { status: calls === 1 ? 401 : 200 },
        ),
      )
    }))
    const result = await pulseApi.getToday()
    expect(result).toEqual(view)
  })
})

// ── 3. pulseApi.upsertCheckIn ─────────────────────────────────────────

describe('pulseApi.upsertCheckIn', () => {
  it('sends PUT /pulse/today/check-in with JSON body and credentials', async () => {
    const view = makeView({ you: { mood: 'bright', energy: 'charged' } })
    stubFetch(view)
    const result = await pulseApi.upsertCheckIn({ mood: 'bright', energy: 'charged' })
    expect(result).toEqual(view)
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining('/pulse/today/check-in'),
      expect.objectContaining({
        method:      'PUT',
        credentials: 'include',
        body:        JSON.stringify({ mood: 'bright', energy: 'charged' }),
      }),
    )
  })

  it('returns the freshly built today view (whatever the server returned)', async () => {
    const view = makeView({
      you:        { mood: 'heavy', energy: 'low' },
      partner:    { name: 'Dan', hasCheckedIn: true, checkIn: { mood: 'tender', energy: 'steady' } },
      reading:    { key: 'carrying-it-together', label: 'Carrying it together' },
      suggestion: 'Tea on the balcony, phones inside',
    })
    stubFetch(view)
    const result = await pulseApi.upsertCheckIn({ mood: 'heavy', energy: 'low' })
    expect(result).toEqual(view)
  })
})
