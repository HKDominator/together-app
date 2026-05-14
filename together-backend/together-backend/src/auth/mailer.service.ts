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
    this.devMode = cfg.get<string>('MAIL_DEV', 'true') === 'true'
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