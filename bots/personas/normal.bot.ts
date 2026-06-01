// Destination: bots/personas/normal.bot.ts
//
// THE CONTROL. A normal user: opens the task list, occasionally
// drills into one, creates a task every minute or so, sometimes pauses
// to "read". Should never trip the heuristic detector — that's the
// validation that thresholds are sane.
//
// Average rate: ~6 requests/min. Well below the 60 burst threshold.
import { test } from '@playwright/test'
import {
  botIdentity, newBotContext, runFor, randItem, sleep,
} from '../helpers/bot-base'

const FAKE_TITLES = [
  'Buy groceries on the way home',
  'Pick up dry cleaning from the corner shop',
  'Call mum about the weekend plan',
  'Schedule the dentist appointment',
  'Plan date night for Friday',
  'Reschedule the gym trainer',
  'Pay the electricity bill',
  'Book a table at the new ramen place',
  'Renew the gym membership',
  'Email the landlord about the leak',
]

export async function runNormalBot(idx: number, durationSec: number) {
  const id  = botIdentity('normal', idx)
  const ctx = await newBotContext(id)
  console.log(`[normal#${idx}] online as ${id.email}`)

  await runFor(`normal#${idx}`, durationSec, 10_000, async () => {
    const r = Math.random()

    if (r < 0.5) {
      // 50% — list tasks (most common action)
      await ctx.get('/api/tasks?page=1&perPage=20')
    } else if (r < 0.7) {
      // 20% — view a random task
      const list = await ctx.get('/api/tasks?page=1&perPage=20')
      if (list.ok()) {
        const body = await list.json() as { items?: Array<{ id: string }> }
        const items = body.items ?? []
        if (items.length > 0) {
          const pick = randItem(items)
          await ctx.get(`/api/tasks/${pick.id}`)
        }
      }
    } else if (r < 0.85) {
      // 15% — create a task (with a 3s "typing" pause to look human)
      const me = await ctx.get('/api/auth/me')
      if (me.ok()) {
        const { user } = await me.json() as { user: { id: string } }
        await sleep(3000)
        await ctx.post('/api/tasks', {
          data: {
            title:      randItem(FAKE_TITLES),
            assigneeId: user.id,
            priority:   randItem(['low', 'medium', 'high']),
          },
          failOnStatusCode: false,
        })
      }
    } else {
      // 15% — comment on the most recent task
      const list = await ctx.get('/api/tasks?page=1&perPage=5')
      if (list.ok()) {
        const body = await list.json() as { items?: Array<{ id: string }> }
        const items = body.items ?? []
        if (items.length > 0) {
          await ctx.post(`/api/tasks/${items[0].id}/comments`, {
            data: { body: randItem([
              'On it tomorrow',
              'Thanks for the reminder',
              'Pushed back to next week',
              'Already done!',
              'Need to talk about this in person',
            ]) },
            failOnStatusCode: false,
          })
        }
      }
    }

    // Occasional reading pause — 15% chance, 30s.
    if (Math.random() < 0.15) await sleep(30_000)
  })

  await ctx.dispose()
  console.log(`[normal#${idx}] offline`)
}

// Allow running via `playwright test personas/normal.bot.ts` for a
// single-persona smoke test.
if( process.env.TEST_WORKER_INDEX !== undefined ) {
test('normal user activity', async () => {
  const idx      = Number(process.env.BOT_IDX      ?? 0)
  const duration = Number(process.env.BOT_DURATION ?? 60)
  await runNormalBot(idx, duration)
})}