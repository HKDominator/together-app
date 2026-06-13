// ADR-0004 Addendum A — Synchronized Breathing field, phase-alignment math.
//
// Pure functions only. The Pulse breathing centerpiece is CSS-driven at idle;
// when the partner comes online the partner circle eases from counter-phase
// into unison over ~3s. That ease is the one subtle piece, so it lives here as
// testable math rather than inline rAF arithmetic.
//
// Hard ceilings (audit-checkable, Addendum A): amplitude ≤ ±4%, period ≥ 6s.

export const BREATH_REST = 1
export const BREATH_AMP = 0.035 // ±3.5% — under the ±4% ceiling
export const BREATH_PERIOD_MS = 7000 // 7s — over the 6s floor
export const ALIGN_DURATION_MS = 3000 // ~3s lerp from counter-phase to unison

/**
 * Eased 0→1 progress of the phase-alignment, clamped to [0,1].
 * Ease-out cubic: convergence is fast then settles — the circles snap toward
 * unison early and ease the last few percent, which reads as "drawn together".
 */
export function alignmentProgress(elapsedMs: number, durationMs = ALIGN_DURATION_MS): number {
  const raw = Math.min(1, Math.max(0, elapsedMs / durationMs))
  return 1 - Math.pow(1 - raw, 3)
}

/** Counter-phase: the partner circle starts breathing opposite to you (π apart). */
export const COUNTER_PHASE = Math.PI

/**
 * The partner circle's phase offset during alignment: COUNTER_PHASE at the
 * start, eased to 0 (unison) by the end of the window. Beyond the window it
 * stays 0 — the alignment is one-directional and does not re-run.
 */
export function partnerPhase(elapsedMs: number, durationMs = ALIGN_DURATION_MS): number {
  return COUNTER_PHASE * (1 - alignmentProgress(elapsedMs, durationMs))
}

/**
 * A circle's scale at absolute time `absMs`, with an optional phase offset.
 * Drives the rAF-painted transform during alignment; the idle breath is the
 * CSS keyframe equivalent (phaseRad = 0). Range is exactly BREATH_REST ± AMP.
 */
export function breathScale(absMs: number, phaseRad = 0): number {
  const angle = (2 * Math.PI * absMs) / BREATH_PERIOD_MS + phaseRad
  return BREATH_REST + BREATH_AMP * Math.sin(angle)
}
