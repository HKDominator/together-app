import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(resolve(__dirname, '../app/globals.css'), 'utf-8')

// ── Brand token block (AUD-02) ────────────────────────────────────────
// DESIGN.md §2 specifies the exact @theme inline block that must exist.
// Absence means bg-cr / text-sl-muted / font-display / focus rings all
// silently resolve to nothing.

describe('globals.css — brand tokens (AUD-02)', () => {
  it('defines --color-cr (Pompeii Crimson)', () =>
    expect(css).toContain('--color-cr: #C0392B'))

  it('defines --color-cr-deep', () =>
    expect(css).toContain('--color-cr-deep: #9B2D22'))

  it('defines --color-cr-pale (Crimson Haze)', () =>
    expect(css).toContain('--color-cr-pale: #FAF0EE'))

  it('defines --color-sl (Slate Void)', () =>
    expect(css).toContain('--color-sl: #1A2535'))

  it('defines --color-sl-muted', () =>
    expect(css).toContain('--color-sl-muted: #4D6A80'))

  it('defines --color-sl-dim', () =>
    expect(css).toContain('--color-sl-dim: #8FA5B8'))

  it('defines --color-cm (Cardamom)', () =>
    expect(css).toContain('--color-cm: #F2EAE3'))

  it('defines --color-cm-pale', () =>
    expect(css).toContain('--color-cm-pale: #FAF8F6'))

  it('defines --font-display (AUD-02 / typography)', () =>
    expect(css).toContain('--font-display: var(--font-geist-sans)'))
})

// ── Body font is Geist, not Arial (AUD-05) ────────────────────────────
describe('globals.css — body font (AUD-05)', () => {
  it('does not override body font to Arial', () =>
    expect(css).not.toContain('Arial'))
})

// ── prefers-reduced-motion (AUD-09) ───────────────────────────────────
// DESIGN.md "Do": provide @media (prefers-reduced-motion: reduce)
// alternatives for every animation.
describe('globals.css — reduced motion (AUD-09)', () => {
  it('has a prefers-reduced-motion media block', () =>
    expect(css).toContain('prefers-reduced-motion'))
})

// ── Bounce easing removed (AUD-13) ───────────────────────────────────
// .modal-enter used cubic-bezier(0.34, 1.56, 0.64, 1) — overshoot > 1
// is the tell. DESIGN.md §Motion bans bounce/elastic curves.
describe('globals.css — no bounce easing (AUD-13)', () => {
  it('modal-enter has no overshoot (1.56 removed)', () =>
    expect(css).not.toContain('1.56'))
})

// ── Page transition: opacity-only, 150ms (motion plan Commit 1) ─────
// pageFadeIn must not move the page (translateY causes perceived lag on
// every navigation). Duration ≤ 150ms so navigation feels instant.
describe('globals.css — page transition (motion plan)', () => {
  it('pageFadeIn keyframe has no translateY', () => {
    const kf = css.slice(css.indexOf('@keyframes pageFadeIn'))
    // grab just the pageFadeIn block (up to the next @keyframes or closing brace sequence)
    const block = kf.slice(0, kf.indexOf('}', kf.indexOf('}') + 1) + 1)
    expect(block).not.toContain('translateY')
  })

  it('page-enter animation duration is 150ms', () =>
    expect(css).toMatch(/\.page-enter\s*\{[^}]*0\.15s/))

  it('stat-pop keyframe is removed (outside the three-category delight inventory)', () =>
    expect(css).not.toContain('statPop'))
})

// ── No accidental dark-mode block (AUD-14) ───────────────────────────
// The app is light-only by design. The dark-mode block flips the body
// gutter to near-black around white cards — unintended and untested.
describe('globals.css — no accidental dark mode (AUD-14)', () => {
  it('has no prefers-color-scheme: dark block', () =>
    expect(css).not.toContain('prefers-color-scheme: dark'))
})

// ── Reduced-motion: targeted, not nuclear (motion plan Commit 6) ────
// DESIGN.md: "crossfade or instant — no flash". The previous rule used
// `* { transition-duration: 0.01ms !important }` which also killed
// opacity/color crossfades that aid comprehension. The new rule:
//   • strips transform-based animations per class
//   • keeps a gentle opacity/color fade (150ms) so state changes still read
//   • still suppresses presence-dot-online animation
describe('globals.css — targeted reduced-motion (motion plan)', () => {
  it('reduced-motion block does not nuke all transitions via the * selector', () => {
    const rmStart = css.indexOf('@media (prefers-reduced-motion: reduce)')
    const rmBlock = css.slice(rmStart)
    // The nuclear rule kills comprehension-aiding opacity/color fades.
    // Confirm the wildcard transition-duration override is gone.
    expect(rmBlock).not.toContain('transition-duration: 0.01ms')
  })

  it('reduced-motion block suppresses transform animations for animation classes', () => {
    const rmStart = css.indexOf('@media (prefers-reduced-motion: reduce)')
    const rmBlock = css.slice(rmStart)
    // At least the completion flash and page-enter classes are listed
    expect(rmBlock).toContain('row-flash-active')
    expect(rmBlock).toContain('page-enter')
  })

  it('reduced-motion block preserves an opacity transition for state changes', () => {
    const rmStart = css.indexOf('@media (prefers-reduced-motion: reduce)')
    const rmBlock = css.slice(rmStart)
    expect(rmBlock).toContain('opacity')
  })
})

// ── Dual-presence pulse animation (DESIGN.md §5) ─────────────────────
// The presence dot needs a CSS animation class ready for Wave 4.
// It must also have a prefers-reduced-motion fallback — the signal
// is carried by color (green vs gray), so removing the animation is
// safe and sufficient.
describe('globals.css — dual-presence pulse animation', () => {
  it('defines presencePulse keyframe', () =>
    expect(css).toContain('presencePulse'))

  it('presence-dot-online is animated', () =>
    expect(css).toContain('.presence-dot-online'))

  it('presence-dot-online animation is suppressed under reduced motion', () => {
    // The prefers-reduced-motion block must contain a rule for .presence-dot-online
    const rmBlock = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(rmBlock).toContain('.presence-dot-online')
  })
})

// ── Contrast verification (DESIGN.md §6) ─────────────────────────────
// These are mathematical assertions documenting that the three flagged
// sidebar color pairings are within their permitted usage bounds.
//
// Formulae: WCAG 2.1 relative luminance + contrast ratio.
// All blending is alpha-composite against the sidebar background #1A2535.

function sRGBToLinear(c: number): number {
  const s = c / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}
function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBToLinear(r) + 0.7152 * sRGBToLinear(g) + 0.0722 * sRGBToLinear(b)
}
function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2)
  const darker  = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}
function blendOnBackground(
  fg: [number, number, number], alpha: number, bg: [number, number, number],
): [number, number, number] {
  return [
    Math.round(fg[0] * alpha + bg[0] * (1 - alpha)),
    Math.round(fg[1] * alpha + bg[1] * (1 - alpha)),
    Math.round(fg[2] * alpha + bg[2] * (1 - alpha)),
  ]
}

const sidebarBg: [number, number, number] = [26, 37, 53]   // #1A2535
const L_sidebarBg = relativeLuminance(...sidebarBg)

describe('contrast ratios — sidebar', () => {
  // Nav item default text: rgba(255,255,255,0.55) on #1A2535
  // DESIGN.md permits this for interactive nav copy.
  it('nav text rgba(255,255,255,0.55) on #1A2535 passes WCAG AA (≥4.5:1)', () => {
    const blended = blendOnBackground([255, 255, 255], 0.55, sidebarBg)
    const L_fg    = relativeLuminance(...blended)
    const ratio   = contrastRatio(L_fg, L_sidebarBg)
    // Documents the calculated ratio — must pass AA for body text
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })

  // Section labels: rgba(255,255,255,0.30) on #1A2535
  // DESIGN.md: "Section label: rgba(255,255,255,0.3) text, label scale. Used sparingly."
  // This is structural / decorative — not reading copy. At 12px it is below
  // AA. The test documents that it is used only for structural section labels
  // and records the ratio; it does NOT assert AA compliance because the
  // design spec knowingly accepts this for a label-scale structural element.
  it('section labels rgba(255,255,255,0.30) on #1A2535 — ratio documented (label scale only)', () => {
    const blended = blendOnBackground([255, 255, 255], 0.30, sidebarBg)
    const L_fg    = relativeLuminance(...blended)
    const ratio   = contrastRatio(L_fg, L_sidebarBg)
    // Ratio is ~2.5:1 — below AA for body text, permitted only for structural
    // section labels (DESIGN.md §5 Navigation). Must NEVER be used for reading copy.
    expect(ratio).toBeGreaterThan(2.0) // floor: confirm it's not invisible
    expect(ratio).toBeLessThan(4.5)    // guard: confirm we're not pretending it passes AA
  })

  // sl-dim (#8FA5B8) on white — placeholder and tertiary text
  // DESIGN.md: "~2.8:1 — use only at label scale or larger; never for body reading copy."
  it('sl-dim #8FA5B8 on white — ratio documented (label scale / placeholder only)', () => {
    const L_slDim = relativeLuminance(143, 165, 184)
    const L_white = relativeLuminance(255, 255, 255)
    const ratio   = contrastRatio(L_slDim, L_white)
    // DESIGN.md documents this as ~2.8:1 — below AA for body copy.
    // Permitted: placeholder text in inputs and tertiary labels only.
    expect(ratio).toBeGreaterThan(2.0) // confirm it's not invisible
    expect(ratio).toBeLessThan(4.5)    // confirm we're not pretending it passes AA
  })
})
