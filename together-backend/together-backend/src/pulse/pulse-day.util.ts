// Destination: together-backend/together-backend/src/pulse/pulse-day.util.ts
// Wave 5 (FD-16 / ADR-0004): the Pulse Day boundary.
//
// The BUG-05 lesson: never compare a UTC-parsed date against local
// midnight. The Pulse Day is always derived from the wall clock of the
// deployment timezone (PULSE_TIMEZONE — single-tenant per ADR-0003, so
// one timezone per deployment is correct), DST included.

/** The local calendar day ('YYYY-MM-DD') of `now` in `timeZone`. */
export function pulseDayFor(now: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}
