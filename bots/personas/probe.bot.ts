// Destination: bots/personas/probe.bot.ts
//
// PROBE. Hits admin endpoints (the bot account is a regular user → 403)
// and pokes around with malformed/unknown IDs (404). 1 req/sec ⇒ ~20
// 4xx errors in 5 minutes, exactly the ERROR4XX_PER_5MIN threshold.
// AI should label it 'probe' — many 4xx, admin/forbidden path hits.
import { test } from '@playwright/test'
import {
  botIdentity, newBotContext, runFor, randItem,
} from '../helpers/bot-base'

interface ProbeTarget {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path:   string
  body?:  Record<string, unknown>
}

const PROBE_TARGETS: ProbeTarget[] = [
  // Forbidden: bots have role=user, no user.manage perm.
  { method: 'GET',    path: '/api/admin/users' },
  { method: 'POST',   path: '/api/admin/users', body: { email: 'evil@x.com' } },
  { method: 'GET',    path: '/api/admin/logs' },
  { method: 'GET',    path: '/api/admin/observation' },

  // Not found: random UUIDs (well-formed but no row).
  { method: 'GET',    path: '/api/tasks/00000000-0000-0000-0000-000000000001' },
  { method: 'PATCH',  path: '/api/tasks/00000000-0000-0000-0000-000000000002',
                       body: { title: 'hacked' } },
  { method: 'DELETE', path: '/api/tasks/00000000-0000-0000-0000-000000000003' },

  // Bad input: bogus tag id.
  { method: 'POST',   path: '/api/tags/task/00000000-0000-0000-0000-000000000004',
                       body: { tagId: 'not-a-uuid' } },
]

export async function runProbeBot(idx: number, durationSec: number) {
  const id  = botIdentity('probe', idx)
  const ctx = await newBotContext(id)
  console.log(`[probe#${idx}] online — knocking on locked doors`)

  await runFor(`probe#${idx}`, durationSec, 1000, async () => {
    const t = randItem(PROBE_TARGETS)
    const opts = { failOnStatusCode: false, data: t.body }
    if (t.method === 'GET')         await ctx.get(t.path)
    else if (t.method === 'POST')   await ctx.post(t.path,  opts)
    else if (t.method === 'PATCH')  await ctx.patch(t.path, opts)
    else                            await ctx.delete(t.path,opts)
  })

  await ctx.dispose()
  console.log(`[probe#${idx}] offline`)
}
if( process.env.TEST_WORKER_INDEX !== undefined ) {
test('probe attack', async () => {
  const idx      = Number(process.env.BOT_IDX      ?? 0)
  const duration = Number(process.env.BOT_DURATION ?? 60)
  await runProbeBot(idx, duration)
})}