// Destination: together-backend/together-backend/src/pulse/reading.spec.ts
// Wave 5 Step 2 (FD-16 / ADR-0004): the Sync Score rule table.
//
// The Reading is the couple's shared mood reading — a named qualitative
// state, never a numeral, never a grade. These specs encode the rule
// precedence approved 2026-06-12 (first match wins):
//   Bright together → Carrying it together → Quiet day for both →
//   Different speeds today → In step → Each in your own weather
// plus the grilled carrying/quiet boundary: "Carrying it together"
// requires both moods ∈ {tender, heavy} AND at least one heavy, so a
// calm low-energy day reads as quiet, never as hardship.
import {
  MOODS, ENERGIES, READINGS, computeReading,
  CheckInValues,
} from './reading'

const allStates: CheckInValues[] = MOODS.flatMap(mood =>
  ENERGIES.map(energy => ({ mood, energy })),
)

describe('computeReading — approved boundary rows (2026-06-12)', () => {
  it('reads calm shared tiredness as "Quiet day for both"', () => {
    expect(computeReading(
      { mood: 'steady', energy: 'low' },
      { mood: 'steady', energy: 'low' },
    )).toBe('quiet-day-for-both')
  })

  it('reads a soft low-energy day (tender + tender) as quiet, never hardship', () => {
    expect(computeReading(
      { mood: 'tender', energy: 'low' },
      { mood: 'tender', energy: 'low' },
    )).toBe('quiet-day-for-both')
  })

  it('reads tender + tender with fuel left as "In step"', () => {
    expect(computeReading(
      { mood: 'tender', energy: 'steady' },
      { mood: 'tender', energy: 'steady' },
    )).toBe('in-step')
  })

  it('reads heavy + tender as "Carrying it together" regardless of energy', () => {
    expect(computeReading(
      { mood: 'heavy', energy: 'charged' },
      { mood: 'tender', energy: 'low' },
    )).toBe('carrying-it-together')
  })

  it('lets carrying outrank quiet when both moods are genuinely heavy', () => {
    expect(computeReading(
      { mood: 'heavy', energy: 'low' },
      { mood: 'heavy', energy: 'low' },
    )).toBe('carrying-it-together')
  })

  it('never names one-sided heaviness "carrying"', () => {
    for (const energyA of ENERGIES) {
      for (const energyB of ENERGIES) {
        expect(computeReading(
          { mood: 'heavy', energy: energyA },
          { mood: 'steady', energy: energyB },
        )).not.toBe('carrying-it-together')
      }
    }
  })

  it('reads both bright with fuel in the tank as "Bright together"', () => {
    expect(computeReading(
      { mood: 'bright', energy: 'charged' },
      { mood: 'bright', energy: 'steady' },
    )).toBe('bright-together')
  })

  it('reads both bright but drained as quiet, not bright', () => {
    expect(computeReading(
      { mood: 'bright', energy: 'low' },
      { mood: 'bright', energy: 'low' },
    )).toBe('quiet-day-for-both')
  })

  it('reads opposite energy ends as "Different speeds today"', () => {
    expect(computeReading(
      { mood: 'bright', energy: 'charged' },
      { mood: 'steady', energy: 'low' },
    )).toBe('different-speeds-today')
  })

  // Corrected from the brief's example table: under the approved
  // precedence the energy-gap rule outranks the catch-all, so distant
  // moods at opposite energy ends still read as "Different speeds today".
  it('reads heavy + steady at opposite energy ends as "Different speeds today"', () => {
    expect(computeReading(
      { mood: 'heavy', energy: 'charged' },
      { mood: 'steady', energy: 'low' },
    )).toBe('different-speeds-today')
  })

  it('falls back to "Each in your own weather" for distant moods at matched energy', () => {
    expect(computeReading(
      { mood: 'bright', energy: 'steady' },
      { mood: 'tender', energy: 'steady' },
    )).toBe('each-in-your-own-weather')
    expect(computeReading(
      { mood: 'heavy', energy: 'steady' },
      { mood: 'steady', energy: 'steady' },
    )).toBe('each-in-your-own-weather')
  })
})

describe('computeReading — table properties (all 144 ordered pairs)', () => {
  it('is total: every ordered pair yields a Reading from the fixed vocabulary', () => {
    for (const a of allStates) {
      for (const b of allStates) {
        expect(Object.keys(READINGS)).toContain(computeReading(a, b))
      }
    }
  })

  it('is symmetric under partner swap', () => {
    for (const a of allStates) {
      for (const b of allStates) {
        expect(computeReading(a, b)).toBe(computeReading(b, a))
      }
    }
  })

  it('is deterministic: same inputs always give the same Reading', () => {
    for (const a of allStates) {
      for (const b of allStates) {
        expect(computeReading(a, b)).toBe(computeReading(a, b))
      }
    }
  })

  it('reaches every Reading in the vocabulary (no dead names)', () => {
    const seen = new Set<string>()
    for (const a of allStates) {
      for (const b of allStates) seen.add(computeReading(a, b))
    }
    expect([...seen].sort()).toEqual(Object.keys(READINGS).sort())
  })
})

describe('Reading vocabulary — surface guarantees', () => {
  it('contains no digits in any label (no numerals can ever render)', () => {
    for (const label of Object.values(READINGS)) {
      expect(label).not.toMatch(/\d/)
    }
  })
})
