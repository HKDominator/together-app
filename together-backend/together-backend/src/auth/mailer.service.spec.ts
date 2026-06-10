// SEC-02: the dev inbox / code-echo path must be OFF unless explicitly and
// safely enabled. These assert MAIL_DEV no longer defaults open, and that it
// can never open in production.
import { MailerService } from './mailer.service'

const cfgFrom = (env: Record<string, string | undefined>) => ({
  get: <T = string>(key: string, def?: T): T =>
    (env[key] as unknown as T) ?? (def as T),
})

describe('MailerService dev gating (SEC-02)', () => {
  it('is NOT in dev mode when MAIL_DEV is unset (no default-true fallback)', async () => {
    const mailer = new MailerService(cfgFrom({}) as any)
    await mailer.send('victim@x.z', 'OTP', 'your code is 123456')

    expect(mailer.isDev()).toBe(false)
    expect(mailer.peek('victim@x.z')).toBeNull()
  })

  it('stays closed in production even if MAIL_DEV=true is mis-set', async () => {
    const mailer = new MailerService(
      cfgFrom({ MAIL_DEV: 'true', NODE_ENV: 'production' }) as any,
    )
    await mailer.send('victim@x.z', 'OTP', 'your code is 123456')

    expect(mailer.isDev()).toBe(false)
    expect(mailer.peek('victim@x.z')).toBeNull()
  })

  it('opens only when explicitly enabled outside production', async () => {
    const mailer = new MailerService(
      cfgFrom({ MAIL_DEV: 'true', NODE_ENV: 'development' }) as any,
    )
    await mailer.send('me@x.z', 'OTP', 'your code is 123456')

    expect(mailer.isDev()).toBe(true)
    expect(mailer.peek('me@x.z')?.body).toContain('123456')
  })
})
