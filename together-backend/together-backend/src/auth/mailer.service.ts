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
  private readonly echoLoginCode: boolean
  private readonly inbox = new Map<string, { subject: string; body: string; at: Date }[]>()

  constructor(cfg: ConfigService) {
    // Fail closed: the dev inbox oracle (peek / GET /auth/dev/inbox) is OFF
    // unless MAIL_DEV is explicitly 'true' AND we are not running in
    // production. Production can never open that oracle even if MAIL_DEV is
    // mis-set (SEC-02).
    const explicitlyEnabled = cfg.get<string>('MAIL_DEV', 'false') === 'true'
    const isProd = cfg.get<string>('NODE_ENV', '') === 'production'
    this.devMode = explicitlyEnabled && !isProd

    // SHOW_LOGIN_CODE: this app ships only a fake mailer, so the sign-in OTP
    // is never actually delivered — in production it would reach nothing but
    // the server logs. For demo deployments (Render/Vercel) where a reviewer
    // has no log access, setting this flag 'true' also returns the code in the
    // login API response so it can be shown in the browser. This DEFEATS the
    // second factor and must stay OFF for any real deployment — hence a
    // dedicated, default-off flag that is NOT gated by NODE_ENV, kept separate
    // from the prod-locked inbox oracle above.
    this.echoLoginCode = this.devMode
      || cfg.get<string>('SHOW_LOGIN_CODE', 'false') === 'true'
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

  // Whether the sign-in OTP may be echoed back in the login API response so
  // the user can read it in the browser (demo deployments with no real mail).
  shouldEchoLoginCode(): boolean { return this.echoLoginCode }
}