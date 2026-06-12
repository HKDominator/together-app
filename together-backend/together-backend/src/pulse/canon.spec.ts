// Destination: together-backend/together-backend/src/pulse/canon.spec.ts
// Wave 5 Step 3 (FD-16 / ADR-0004): the Curated Canon + deterministic pick.
//
// The Canon is the guaranteed quality floor of Couple Pulse — on a
// deployment with no model pulled it is all anyone ever sees. Copy was
// approved by the product owner 2026-06-12 (.scratch/couple-pulse/
// canon-draft.md). These specs enforce the grilled entry rules
// mechanically where a rule is mechanical: per-Reading minimum count,
// digit-free, no em dashes (the CR-05 lesson), length cap, unique ids.
// The deterministic pick is a stable function of (Pulse Day, Reading)
// so the degradation path and lazy repair can never disagree about
// which entry a given day gets.
import { CANON, CanonEntry, pickCanonEntry, CANON_TEXT_MAX } from './canon'
import { READINGS, ReadingKey } from './reading'

const readingKeys = Object.keys(READINGS) as ReadingKey[]
const allEntries: CanonEntry[] = readingKeys.flatMap(k => [...CANON[k]])

describe('Curated Canon — entry rules', () => {
  it('covers every Reading in the vocabulary', () => {
    expect(Object.keys(CANON).sort()).toEqual(readingKeys.sort())
  })

  it('has at least six entries per Reading', () => {
    for (const k of readingKeys) {
      expect(CANON[k].length).toBeGreaterThanOrEqual(6)
    }
  })

  it('contains no digits in any entry (no numerals can ever render)', () => {
    for (const e of allEntries) {
      expect(e.text).not.toMatch(/\d/)
    }
  })

  it('contains no em dashes in any entry', () => {
    for (const e of allEntries) {
      expect(e.text).not.toContain('—')
    }
  })

  it('keeps every entry under the length cap', () => {
    for (const e of allEntries) {
      expect(e.text.length).toBeGreaterThan(0)
      expect(e.text.length).toBeLessThanOrEqual(CANON_TEXT_MAX)
    }
  })

  it('has globally unique entry ids (canonEntryId traceability)', () => {
    const ids = allEntries.map(e => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keeps the canonical register anchor verbatim', () => {
    const quiet = CANON['quiet-day-for-both'].map(e => e.text)
    expect(quiet).toContain('Tea on the balcony, phones inside.')
  })
})

describe('pickCanonEntry — deterministic (Pulse Day, Reading) pick', () => {
  it('returns the same entry for the same day and Reading, every call', () => {
    for (const k of readingKeys) {
      const first = pickCanonEntry('2026-06-12', k)
      for (let i = 0; i < 5; i++) {
        expect(pickCanonEntry('2026-06-12', k)).toEqual(first)
      }
    }
  })

  it('always returns an entry that belongs to the requested Reading', () => {
    const days = ['2026-06-12', '2026-06-13', '2026-12-31', '2027-01-01']
    for (const k of readingKeys) {
      for (const day of days) {
        expect(CANON[k]).toContainEqual(pickCanonEntry(day, k))
      }
    }
  })

  it('varies with the Pulse Day (the date participates in the pick)', () => {
    // Across a month of days, a Reading with six-plus entries must hit
    // more than one of them — guards against a constant-index bug.
    for (const k of readingKeys) {
      const seen = new Set<string>()
      for (let d = 1; d <= 28; d++) {
        const day = `2026-06-${String(d).padStart(2, '0')}`
        seen.add(pickCanonEntry(day, k).id)
      }
      expect(seen.size).toBeGreaterThan(1)
    }
  })
})
