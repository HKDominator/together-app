// Destination: bots/swarm.ts
//
// Main entry point. Spawns N of each persona in parallel and waits
// for the duration to elapse. Each persona runs as its own Promise
// — they share no state.
//
// Usage:
//   npm run swarm:demo
//   ts-node swarm.ts --normal=3 --scraper=2 --vandal=1 --probe=2 --duration=120
import { runNormalBot }  from './personas/normal.bot'
import { runScraperBot } from './personas/scraper.bot'
import { runVandalBot }  from './personas/vandal.bot'
import { runProbeBot }   from './personas/probe.bot'

interface Args {
  normal:   number
  scraper:  number
  vandal:   number
  probe:    number
  duration: number
}

function parseArgs(argv: string[]): Args {
  const args: Args = { normal: 2, scraper: 1, vandal: 1, probe: 1, duration: 90 }
  for (const a of argv.slice(2)) {
    const m = /^--(\w+)=(\d+)$/.exec(a)
    if (!m) continue
    const [, k, vRaw] = m
    const v = Number(vRaw)
    if (k in args) (args as unknown as Record<string, number>)[k] = v
  }
  return args
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<void> {
  try { await fn() } catch (e) {
    console.error(`[${label}] crashed: ${(e as Error).message}`)
  }
}

async function main() {
  const args = parseArgs(process.argv)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Together attack-bot swarm')
  console.log(`  normal:   ${args.normal}`)
  console.log(`  scraper:  ${args.scraper}`)
  console.log(`  vandal:   ${args.vandal}`)
  console.log(`  probe:    ${args.probe}`)
  console.log(`  duration: ${args.duration}s`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const jobs: Promise<void>[] = []
  for (let i = 0; i < args.normal;  i++) jobs.push(safe(`normal#${i}`,  () => runNormalBot(i,  args.duration)))
  for (let i = 0; i < args.scraper; i++) jobs.push(safe(`scraper#${i}`, () => runScraperBot(i, args.duration)))
  for (let i = 0; i < args.vandal;  i++) jobs.push(safe(`vandal#${i}`,  () => runVandalBot(i,  args.duration)))
  for (let i = 0; i < args.probe;   i++) jobs.push(safe(`probe#${i}`,   () => runProbeBot(i,   args.duration)))

  await Promise.all(jobs)
  console.log('━━━ swarm complete ━━━')
}

main().catch(err => { console.error(err); process.exit(1) })