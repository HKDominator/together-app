// ADR-0004 Addendum A — Synchronized Breathing phase-alignment math.
// Pure deep module: the subtle lerp timing lives here so it can be specified
// exactly, free of rAF/DOM flakiness. The component is thin glue over this.
import { describe, it, expect } from 'vitest'
import {
  BREATH_AMP,
  BREATH_PERIOD_MS,
  ALIGN_DURATION_MS,
  BREATH_REST,
  alignmentProgress,
  partnerPhase,
  breathScale,
} from '@/lib/breath'

describe('breath math — ADR-0004 Addendum A hard ceilings', () => {
  it('breathing amplitude does not exceed ±4%', () => {
    expect(BREATH_AMP).toBeLessThanOrEqual(0.04)
  })

  it('breathing period is at least 6s', () => {
    expect(BREATH_PERIOD_MS).toBeGreaterThanOrEqual(6000)
  })
})

describe('breath math — alignmentProgress (eased 0→1)', () => {
  it('is 0 at the start of the alignment window', () => {
    expect(alignmentProgress(0)).toBe(0)
  })

  it('reaches 1 at the end of the alignment window', () => {
    expect(alignmentProgress(ALIGN_DURATION_MS)).toBeCloseTo(1, 5)
  })

  it('clamps to 1 past the window (one-directional, never overshoots)', () => {
    expect(alignmentProgress(ALIGN_DURATION_MS * 3)).toBe(1)
  })

  it('is ease-out (front-loaded): past halfway in progress by the time midpoint', () => {
    expect(alignmentProgress(ALIGN_DURATION_MS / 2)).toBeGreaterThan(0.5)
  })

  it('is monotonically non-decreasing across the window', () => {
    let prev = -1
    for (let t = 0; t <= ALIGN_DURATION_MS; t += ALIGN_DURATION_MS / 20) {
      const p = alignmentProgress(t)
      expect(p).toBeGreaterThanOrEqual(prev)
      prev = p
    }
  })
})

describe('breath math — partnerPhase (counter-phase → unison)', () => {
  it('starts in counter-phase (π) so the partner breathes against you at first', () => {
    expect(partnerPhase(0)).toBeCloseTo(Math.PI, 5)
  })

  it('ends in unison (phase offset 0) after the alignment window', () => {
    expect(partnerPhase(ALIGN_DURATION_MS)).toBeCloseTo(0, 5)
  })
})

describe('breath math — breathScale', () => {
  const SAMPLE_TIMES = [0, 875, 1750, 2625, 3500, 5250, 7000]

  it('never exceeds the rest ± amplitude envelope (ceiling held at runtime)', () => {
    for (let t = 0; t <= BREATH_PERIOD_MS; t += 100) {
      const s = breathScale(t, 0)
      expect(s).toBeGreaterThanOrEqual(BREATH_REST - BREATH_AMP - 1e-9)
      expect(s).toBeLessThanOrEqual(BREATH_REST + BREATH_AMP + 1e-9)
    }
  })

  it('partner and you breathe APART at the start of alignment (counter-phase)', () => {
    // At least one sample time shows a meaningful divergence.
    const diffs = SAMPLE_TIMES.map(t =>
      Math.abs(breathScale(t, partnerPhase(0)) - breathScale(t, 0)),
    )
    expect(Math.max(...diffs)).toBeGreaterThan(BREATH_AMP) // clearly out of sync
  })

  it('partner and you breathe in UNISON after the window — they end together', () => {
    for (const t of SAMPLE_TIMES) {
      const partner = breathScale(t, partnerPhase(ALIGN_DURATION_MS))
      const you     = breathScale(t, 0)
      expect(partner).toBeCloseTo(you, 5)
    }
  })
})
