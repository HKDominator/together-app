// Destination: bots/helpers/bot-base.ts
//
// Shared helpers for every persona. Each persona is a small loop
// driven by runFor() that calls into an authenticated APIRequestContext
// — Playwright keeps cookies automatically once we authenticate.
import { request, APIRequestContext } from '@playwright/test'

const API_URL = process.env.API_URL ?? 'https://localhost:3001'

export const BOT_PASSWORD = 'BotPassword!42'

// Stable identities. Reusing them across runs means the
// observation_list rows accumulate, which is great for the demo.
export function botIdentity(persona: string, idx: number) {
  return {
    email: `bot-${persona}-${idx}@bots.local`,
    name:  `Bot ${persona[0]?.toUpperCase()}${persona.slice(1)} #${idx}`,
    password: BOT_PASSWORD,
  }
}

export async function newBotContext(id: ReturnType<typeof botIdentity>): Promise<APIRequestContext> {
  // Playwright APIRequestContext is cookie-aware by default.
  const ctx = await request.newContext({
    baseURL: API_URL,
    ignoreHTTPSErrors: true, // for local dev with self-signed certs
    extraHTTPHeaders: { 'X-Bot': 'together-attack-bots' },
  })
  await registerOrLogin(ctx, id)
  return ctx
}

async function registerOrLogin(
  ctx: APIRequestContext,
  id: ReturnType<typeof botIdentity>,
): Promise<void> {
  // Try register first.
  const reg = await ctx.post('/api/auth/register', {
    data: { email: id.email, password: id.password, name: id.name },
    failOnStatusCode: false,
  })
  if (reg.ok()) return

  // 409 (exists) or 400 → fall back to login. seed-big.ts disables 2FA
  // for seeded users, so we expect stage='done' in one call. If a
  // bot somehow had 2FA on we'd need the OTP — the seed prevents this.
  const login = await ctx.post('/api/auth/login', {
    data: { email: id.email, password: id.password },
    failOnStatusCode: false,
  })
  if (!login.ok()) {
    const body = await login.text()
    throw new Error(`Bot ${id.email} could not log in (HTTP ${login.status()}): ${body}`)
  }
  const stage = await login.json() as { stage: string; devOtp?: string; attemptId?: string }
  if (stage.stage === 'done') return
  if (stage.stage === 'otp' && stage.devOtp && stage.attemptId) {
    // Some envs leave dev-mailer on. Complete the OTP step.
    const otp = await ctx.post('/api/auth/login/otp', {
      data: { attemptId: stage.attemptId, code: stage.devOtp },
      failOnStatusCode: false,
    })
    if (!otp.ok()) throw new Error(`OTP step failed for ${id.email}`)
    return
  }
  throw new Error(`Bot ${id.email} got unexpected login stage: ${stage.stage}`)
}

// ── Tiny utilities ───────────────────────────────────────────
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

export function jitter(baseMs: number, spreadPct = 0.3): number {
  const spread = baseMs * spreadPct
  return Math.round(baseMs - spread + Math.random() * spread * 2)
}

export function randItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Runs `step` repeatedly, sleeping `intervalMs` (jittered) between calls,
 * until `durationSec` has elapsed. Prints a "tick" message every 10s.
 */
export async function runFor(
  label: string,
  durationSec: number,
  intervalMs: number,
  step: () => Promise<void>,
): Promise<void> {
  const end = Date.now() + durationSec * 1000
  let nextLog = Date.now() + 10_000
  let ticks = 0
  while (Date.now() < end) {
    try { await step() } catch (e) {
      console.error(`[${label}] step failed: ${(e as Error).message}`)
    }
    ticks++
    if (Date.now() > nextLog) {
      console.log(`[${label}] ${ticks} ticks, ${Math.round((end - Date.now()) / 1000)}s remaining`)
      nextLog = Date.now() + 10_000
    }
    await sleep(jitter(intervalMs))
  }
  console.log(`[${label}] done — ${ticks} ticks total`)
}