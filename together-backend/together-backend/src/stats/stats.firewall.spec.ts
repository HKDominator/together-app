// Destination: together-backend/together-backend/src/stats/stats.firewall.spec.ts
// Wave 5 Step 7 (FD-16 / ADR-0004): statistics firewall tripwire.
//
// ADR-0004 hard boundary: "the shared-progress view and every other
// analytics surface must not consume Pulse data." This spec is a CI
// guard — it fails the moment anyone adds a pulse import to StatsModule
// or StatsService, or slips a mood/energy/reading field into TasksStats.
//
// No code change is needed today (boundary already clean); the tripwire
// IS the deliverable. Implemented as source-text assertions so the guard
// survives TypeScript refactors, tree-shaking, and barrel re-exports.
import * as fs   from 'fs'
import * as path from 'path'

const readSrc = (filename: string) =>
  fs.readFileSync(path.join(__dirname, filename), 'utf8')

describe('ADR-0004 statistics firewall — Pulse data must never flow into analytics', () => {
  it('StatsModule has no import from src/pulse/', () => {
    const src = readSrc('stats.module.ts')
    expect(src).not.toMatch(/import\s+.*\bpulse\b/i)
    expect(src).not.toMatch(/from\s+['"].*pulse/)
  })

  it('StatsService has no import from src/pulse/', () => {
    const src = readSrc('stats.service.ts')
    expect(src).not.toMatch(/import\s+.*\bpulse\b/i)
    expect(src).not.toMatch(/from\s+['"].*pulse/)
  })

  it('TasksStats response shape has no Pulse-derived fields (mood/energy/reading/checkIn)', () => {
    const src   = readSrc('stats.service.ts')
    const match = src.match(/interface TasksStats \{[^}]*\}/)
    expect(match).not.toBeNull()
    expect(match![0]).not.toMatch(/mood|energy|reading|pulse|checkIn/i)
  })

  it('StatsModule does not list PulseModule as an import', () => {
    const src = readSrc('stats.module.ts')
    expect(src).not.toMatch(/PulseModule/)
  })
})
