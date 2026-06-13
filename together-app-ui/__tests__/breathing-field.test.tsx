// Synchronized Breathing field (ADR-0004 Addendum A) — component spec.
// Tests verify behavior through the public DOM interface only: presence/absence
// of circles, ARIA decoration contract, and animation class names that are the
// public CSS contract (not internal implementation details).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import BreathingField from '@/components/pulse/BreathingField'

// ── Deterministic motion harness ──────────────────────────────────────
// rAF + performance.now are hand-stubbed so the phase-alignment loop can be
// stepped frame-by-frame without timing flakiness. matchMedia controls the
// reduced-motion gate per test.
let now = 0
let rafCbs: FrameRequestCallback[] = []

function step(dt = 600) {
  now += dt
  const due = rafCbs
  rafCbs = []
  due.forEach(cb => cb(now))
}

function setReducedMotion(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {},
    addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }))
}

beforeEach(() => {
  now = 0
  rafCbs = []
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCbs.push(cb)
    return rafCbs.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  setReducedMotion(false)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BreathingField', () => {
  it('always renders the "you" breathing circle', () => {
    render(<BreathingField partnerPresent={false} />)
    expect(screen.getByTestId('breath-you')).toBeInTheDocument()
  })

  it('shows no partner circle when partnerPresent is false', () => {
    render(<BreathingField partnerPresent={false} />)
    expect(screen.queryByTestId('breath-partner')).toBeNull()
  })

  it('renders the partner circle when partnerPresent is true', () => {
    render(<BreathingField partnerPresent={true} />)
    expect(screen.getByTestId('breath-partner')).toBeInTheDocument()
  })

  it('is aria-hidden so screen readers skip the decorative field', () => {
    const { container } = render(<BreathingField partnerPresent={false} />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('"you" orb carries the breath-orb-anim class (animation contract)', () => {
    render(<BreathingField partnerPresent={false} />)
    expect(screen.getByTestId('breath-you')).toHaveClass('breath-orb-anim')
  })
})

describe('BreathingField — phase-alignment', () => {
  it('drives the partner circle with an inline transform when it appears', () => {
    const { rerender } = render(<BreathingField partnerPresent={false} />)
    act(() => { rerender(<BreathingField partnerPresent={true} />) })
    act(() => { step() })
    expect(screen.getByTestId('breath-partner').style.transform).toContain('scale')
  })

  it('does NOT JS-animate the partner circle under reduced motion (still shown)', () => {
    setReducedMotion(true)
    const { rerender } = render(<BreathingField partnerPresent={false} />)
    act(() => { rerender(<BreathingField partnerPresent={true} />) })
    act(() => { step() })
    const partner = screen.getByTestId('breath-partner')
    expect(partner).toBeInTheDocument()          // presence shown by geometry
    expect(partner.style.transform).toBe('')     // no JS-driven motion
  })

  it('hands back to the CSS breath after the window (clears the inline transform)', () => {
    const { rerender } = render(<BreathingField partnerPresent={false} />)
    act(() => { rerender(<BreathingField partnerPresent={true} />) })
    // Step well past the ~3s alignment window.
    act(() => { step(1000) })
    act(() => { step(1000) })
    act(() => { step(1000) })
    act(() => { step(1000) })
    expect(screen.getByTestId('breath-partner').style.transform).toBe('')
  })
})

describe('BreathingField — recede (state d halo)', () => {
  it('carries the breath-recede class when recede is set', () => {
    const { container } = render(<BreathingField partnerPresent={false} recede />)
    expect(container.firstChild).toHaveClass('breath-recede')
  })

  it('does not carry breath-recede by default (centerpiece in sparse states)', () => {
    const { container } = render(<BreathingField partnerPresent={false} />)
    expect(container.firstChild).not.toHaveClass('breath-recede')
  })
})
