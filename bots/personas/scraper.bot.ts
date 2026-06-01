// Destination: bots/personas/scraper.bot.ts
//
// SCRAPER. Pulls every list endpoint as fast as it can. 6 req/sec ⇒
// 360/min, six times the BURST_PER_MIN threshold. AI should label it
// 'scraper' — high reads, low writes, near-zero errors.
import { test } from '@playwright/test'
import {
  botIdentity, newBotContext, runFor, randItem,
} from '../helpers/bot-base'

const SCRAPE_TARGETS = [
  '/api/tasks?page=1&perPage=50',
  '/api/tasks?page=2&perPage=50',
  '/api/tasks?page=3&perPage=50',
  '/api/users',
  '/api/tags',
  '/api/stats',
  '/api/auth/me',
] as const

export async function runScraperBot(idx: number, durationSec: number) {
  const id  = botIdentity('scraper', idx)
  const ctx = await newBotContext(id)
  console.log(`[scraper#${idx}] online — pulling everything`)

  // 165ms interval ≈ 6 req/s after jitter. Well above 60/min burst.
  await runFor(`scraper#${idx}`, durationSec, 165, async () => {
    await ctx.get(randItem(SCRAPE_TARGETS), { failOnStatusCode: false })
  })

  await ctx.dispose()
  console.log(`[scraper#${idx}] offline`)
}
if( process.env.TEST_WORKER_INDEX !== undefined ) {
test('scraper burst', async () => {
  const idx      = Number(process.env.BOT_IDX      ?? 0)
  const duration = Number(process.env.BOT_DURATION ?? 60)
  await runScraperBot(idx, duration)
})}