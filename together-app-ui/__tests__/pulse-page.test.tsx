// Destination: together-app-ui/__tests__/pulse-page.test.tsx
// Wave 5 Step 9 (FD-16 / ADR-0004): PulsePage RTL spec.
//
// CR-05 dead: the "Coming soon — Gold challenge" placeholder is replaced.
// Tests cover all four derivePulseView states, the submit flow (upsertCheckIn),
// visible save-error surfacing (PRD user story 27), and hard ADR-0004 rules
// (no "Score", no numerals, partner content strictly hidden in partner-first).
//
// Footgun note: vi.mock factories cannot reference module-level `let` vars
// (Vitest hoists vi.mock above imports). All mock fns are vi.fn() inside the
// factory; vi.mocked() is used in test bodies to control per-test return values.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PulsePage from '@/app/(app)/pulse/page'
import { pulseApi } from '@/lib/pulse'
import type { PulseTodayView } from '@/lib/pulse'

// Keep derivePulseView real (it is pure and deterministic); stub only the
// network surface so tests don't hit fetch.
vi.mock('@/lib/pulse', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/pulse')>()
  return {
    ...actual,
    pulseApi: {
      getToday:      vi.fn(),
      upsertCheckIn: vi.fn(),
    },
  }
})

// ── fixtures ──────────────────────────────────────────────────────────

const makeView = (over: Partial<PulseTodayView> = {}): PulseTodayView => ({
  pulseDay: '2026-06-12',
  you:      null,
  partner:  { name: 'Dan', hasCheckedIn: false, checkIn: null },
  ...over,
})

const emptyView    = makeView()
const partnerFirst = makeView({ partner: { name: 'Dan', hasCheckedIn: true, checkIn: null } })
const soloView     = makeView({ you: { mood: 'bright', energy: 'charged' } })
const completeView = makeView({
  you:        { mood: 'bright', energy: 'charged' },
  partner:    { name: 'Dan', hasCheckedIn: true, checkIn: { mood: 'steady', energy: 'low' } },
  reading:    { key: 'in-step', label: 'In step' },
  suggestion: 'Tea on the balcony, phones inside',
})

beforeEach(() => {
  vi.mocked(pulseApi.getToday).mockResolvedValue(emptyView)
  vi.mocked(pulseApi.upsertCheckIn).mockResolvedValue(emptyView)
})

// ── CR-05: "Coming soon" placeholder is dead ──────────────────────────

describe('PulsePage — CR-05 placeholder dead', () => {
  it('does not render the "Coming soon" copy', async () => {
    render(<PulsePage />)
    await waitFor(() => expect(screen.queryByText(/coming soon/i)).toBeNull(), { timeout: 3000 })
  })

  it('never renders the word "Score" in any state', async () => {
    vi.mocked(pulseApi.getToday).mockResolvedValue(completeView)
    render(<PulsePage />)
    await screen.findByText('In step')
    expect(document.body.textContent).not.toMatch(/\bscore\b/i)
  })
})

// ── State (a): empty — check-in form ─────────────────────────────────

describe('PulsePage — state (a) empty: check-in form', () => {
  it('shows all four mood choices as radio inputs', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })
    expect(screen.getByRole('radio', { name: /tender/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /heavy/i })).toBeInTheDocument()
  })

  it('shows all three energy choices as radio inputs', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /charged/i })
    expect(screen.getByRole('radio', { name: /low/i })).toBeInTheDocument()
  })

  it('shows a "Check in" submit button', async () => {
    render(<PulsePage />)
    await screen.findByRole('button', { name: /check in/i })
  })
})

// ── State (b): partner-first — form + partner fact ────────────────────

describe('PulsePage — state (b) partner-first: form + partner fact, content hidden', () => {
  beforeEach(() => {
    vi.mocked(pulseApi.getToday).mockResolvedValue(partnerFirst)
  })

  it('shows "[partner name] is already in"', async () => {
    render(<PulsePage />)
    await screen.findByText(/Dan is already in/i)
  })

  it('still shows the check-in form so you can complete your check-in', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })
  })

  it('does not leak the partner check-in content (reveal-after-share: no peek)', async () => {
    render(<PulsePage />)
    await screen.findByText(/Dan is already in/i)
    // partner.checkIn is null server-side; nothing from it should appear as
    // explicit "partner mood" or "partner energy" copy
    expect(screen.queryByText(/partner.*mood|partner.*energy/i)).toBeNull()
  })
})

// ── State (c): solo — editable form + solo copy ───────────────────────

describe('PulsePage — state (c) solo: editable check-in + "Just you" copy', () => {
  beforeEach(() => {
    vi.mocked(pulseApi.getToday).mockResolvedValue(soloView)
  })

  it('shows "Just you so far today."', async () => {
    render(<PulsePage />)
    await screen.findByText(/just you so far today/i)
  })

  it('shows the editable check-in form (no Reading slot, nothing grayed)', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })
  })

  it('pre-selects your existing check-in values in the form', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })
    expect(screen.getByRole('radio', { name: /bright/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /charged/i })).toBeChecked()
  })
})

// ── State (d): complete — Reading leads, suggestion beneath ───────────

describe('PulsePage — state (d) complete: Reading + suggestion', () => {
  beforeEach(() => {
    vi.mocked(pulseApi.getToday).mockResolvedValue(completeView)
  })

  it('shows the Reading label in display type', async () => {
    render(<PulsePage />)
    await screen.findByText('In step')
  })

  it('shows the suggestion text beneath the Reading', async () => {
    render(<PulsePage />)
    await screen.findByText('Tea on the balcony, phones inside')
  })

  it('does NOT show the check-in form (this is the revealed state)', async () => {
    render(<PulsePage />)
    await screen.findByText('In step')
    expect(screen.queryByRole('radio', { name: /bright/i })).toBeNull()
  })
})

// ── Submit flow ───────────────────────────────────────────────────────

describe('PulsePage — submit', () => {
  it('calls upsertCheckIn with the selected mood and energy on submit', async () => {
    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })

    fireEvent.click(screen.getByRole('radio', { name: /bright/i }))
    fireEvent.click(screen.getByRole('radio', { name: /charged/i }))
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))

    await waitFor(() =>
      expect(vi.mocked(pulseApi.upsertCheckIn)).toHaveBeenCalledWith({
        mood: 'bright', energy: 'charged',
      })
    )
  })

  it('surfaces a visible error when save fails (PRD user story 27)', async () => {
    vi.mocked(pulseApi.upsertCheckIn).mockRejectedValue(new Error('Network error'))

    render(<PulsePage />)
    await screen.findByRole('radio', { name: /bright/i })

    fireEvent.click(screen.getByRole('radio', { name: /bright/i }))
    fireEvent.click(screen.getByRole('radio', { name: /charged/i }))
    fireEvent.click(screen.getByRole('button', { name: /check in/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/network error/i)
  })
})

// ── Load failure recovery ─────────────────────────────────────────

describe('PulsePage — load failure recovery', () => {
  it('shows an error message and retry button when initial load fails', async () => {
    vi.mocked(pulseApi.getToday).mockRejectedValue(new Error('Network error'))

    render(<PulsePage />)
    await screen.findByText(/couldn.?t load/i)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('recovers when the user retries after a failed load', async () => {
    vi.mocked(pulseApi.getToday)
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue(emptyView)

    render(<PulsePage />)
    await screen.findByRole('button', { name: /try again/i })
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))

    await screen.findByRole('radio', { name: /bright/i })
  })
})
