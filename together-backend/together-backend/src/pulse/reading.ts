// Destination: together-backend/together-backend/src/pulse/reading.ts
// Wave 5 (FD-16 / ADR-0004): the Sync Score rule table.
//
// Deterministic, pure, in-code — the same house pattern as
// AiAnomalyService.featureBasedVerdict: priority-ordered first-match
// rules with a catch-all that guarantees totality. The LLM never
// computes or influences the Reading.
//
// Vocabulary frozen 2026-06-12 (CONTEXT.md "Couple Pulse"). Array order
// matters: it defines adjacency on each scale (mood bright→heavy,
// energy charged→low), which the gap rules below rely on. No numeric
// value ever leaves this module — a Reading is a name, not a score.

export const MOODS = ['bright', 'steady', 'tender', 'heavy'] as const
export type Mood = (typeof MOODS)[number]

export const ENERGIES = ['charged', 'steady', 'low'] as const
export type Energy = (typeof ENERGIES)[number]

export interface CheckInValues {
  mood:   Mood
  energy: Energy
}

export const READINGS = {
  'bright-together':          'Bright together',
  'carrying-it-together':     'Carrying it together',
  'quiet-day-for-both':       'Quiet day for both',
  'different-speeds-today':   'Different speeds today',
  'in-step':                  'In step',
  'each-in-your-own-weather': 'Each in your own weather',
} as const
export type ReadingKey = keyof typeof READINGS

const moodGap   = (a: Mood, b: Mood)     => Math.abs(MOODS.indexOf(a) - MOODS.indexOf(b))
const energyGap = (a: Energy, b: Energy) => Math.abs(ENERGIES.indexOf(a) - ENERGIES.indexOf(b))
const heavyish  = (m: Mood) => m === 'tender' || m === 'heavy'

/**
 * Maps the unordered pair of check-ins to a Reading. Symmetric by
 * construction — every predicate treats a and b identically, so
 * computeReading(a, b) === computeReading(b, a) for all inputs.
 *
 * Rule precedence approved 2026-06-12. The carrying/quiet boundary is
 * deliberate product copy, not an implementation choice: "Carrying it
 * together" needs both moods in {tender, heavy} AND at least one heavy,
 * so a calm or soft low-energy day reads as quiet, never as hardship,
 * and one-sided heaviness is never attributed as "carrying".
 */
export function computeReading(a: CheckInValues, b: CheckInValues): ReadingKey {
  if (a.mood === 'bright' && b.mood === 'bright' && a.energy !== 'low' && b.energy !== 'low') {
    return 'bright-together'
  }
  if (heavyish(a.mood) && heavyish(b.mood) && (a.mood === 'heavy' || b.mood === 'heavy')) {
    return 'carrying-it-together'
  }
  if (a.energy === 'low' && b.energy === 'low') {
    return 'quiet-day-for-both'
  }
  if (energyGap(a.energy, b.energy) === 2) {
    return 'different-speeds-today'
  }
  if (moodGap(a.mood, b.mood) <= 1 && energyGap(a.energy, b.energy) <= 1) {
    return 'in-step'
  }
  return 'each-in-your-own-weather'
}
