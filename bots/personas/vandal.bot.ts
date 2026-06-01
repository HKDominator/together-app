// Destination: bots/personas/vandal.bot.ts
//
// VANDAL. Creates a task and immediately deletes it. Hits the
// DELETE_PER_5MIN threshold (10) inside ~45s, and the AI should label
// it 'vandal' — very high deletes, near-zero reads.
import { test } from '@playwright/test'
import {
  botIdentity, newBotContext, runFor,
} from '../helpers/bot-base'

export async function runVandalBot(idx: number, durationSec: number) {
  const id  = botIdentity('vandal', idx)
  const ctx = await newBotContext(id)
  console.log(`[vandal#${idx}] online — destroying things`)

  // Cache our user id once.
  const me = await ctx.get('/api/auth/me')
  if (!me.ok()) {
    console.error(`[vandal#${idx}] /me failed — bailing`)
    await ctx.dispose()
    return
  }
  const { user } = await me.json() as { user: { id: string } }

  await runFor(`vandal#${idx}`, durationSec, 4000, async () => {
    const create = await ctx.post('/api/tasks', {
      data: {
        title: `Delete me ${Date.now()}`,
        assigneeId: user.id,
        priority:   'low',
      },
      failOnStatusCode: false,
    })
    if (!create.ok()) return
    const task = await create.json() as { id: string }
    await ctx.delete(`/api/tasks/${task.id}`, { failOnStatusCode: false })
  })

  await ctx.dispose()
  console.log(`[vandal#${idx}] offline`)
}
if( process.env.TEST_WORKER_INDEX !== undefined ) {
test('vandal spree', async () => {
  const idx      = Number(process.env.BOT_IDX      ?? 0)
  const duration = Number(process.env.BOT_DURATION ?? 60)
  await runVandalBot(idx, duration)
})}