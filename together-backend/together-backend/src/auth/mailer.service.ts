// Destination: together-backend/src/auth/mailer.service.ts
// Fake mailer for the lab. In production this would proxy to nodemailer
// + a real SMTP. For the lab we log to console AND, in dev mode (MAIL_DEV=true),
// expose the last code via getLastCode(email) — so the grader can grab
// the OTP without an inbox.
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class MailerService {
  private readonly log = new Logger(MailerService.name)
  private readonly devMode: boolean
  private readonly inbox = new Map<string, { subject: string; body: string; at: Date }[]>()

  constructor(cfg: ConfigService) {
    // Fail closed: the dev inbox / code-echo path is OFF unless MAIL_DEV is
    // explicitly 'true' AND we are not running in production. Production can
    // never open this oracle even if MAIL_DEV is mis-set (SEC-02).
    const explicitlyEnabled = cfg.get<string>('MAIL_DEV', 'false') === 'true'
    const isProd = cfg.get<string>('NODE_ENV', '') === 'production'
    this.devMode = explicitlyEnabled && !isProd
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    this.log.log(`📧  → ${to}  ${subject}`)
    this.log.log(`     ${body.split('\n').join('\n     ')}`)
    if (!this.inbox.has(to)) this.inbox.set(to, [])
    this.inbox.get(to)!.push({ subject, body, at: new Date() })
  }

  // Lab-only helper. Returns the most recent message for an inbox.
  // The /auth/dev/inbox endpoint exposes this in dev mode for testing.
  peek(to: string): { subject: string; body: string; at: Date } | null {
    if (!this.devMode) return null
    const msgs = this.inbox.get(to)
    return msgs?.length ? msgs[msgs.length - 1] : null
  }

  isDev(): boolean { return this.devMode }
}