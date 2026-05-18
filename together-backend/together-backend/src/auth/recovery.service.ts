// Destination: together-backend/src/auth/recovery.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { User } from '../users/entities/user.entity'
import { PasswordReset } from './entities/password-reset.entity'
import { Session } from './entities/session.entity'
import { MailerService } from './mailer.service'

const RESET_TTL_SEC = 30 * 60       // 30 min

@Injectable()
export class RecoveryService {
  private readonly log = new Logger(RecoveryService.name)

  constructor(
    @InjectRepository(User)          private readonly users:    Repository<User>,
    @InjectRepository(PasswordReset) private readonly resets:   Repository<PasswordReset>,
    @InjectRepository(Session)       private readonly sessions: Repository<Session>,
    private readonly mailer: MailerService,
  ) {}

  // Step 1: user submits email. We always return success (to prevent
  // email enumeration), but only actually mail a token if the email
  // exists.
  async request(email: string): Promise<{ ok: true; devCode?: string }> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } })
    if (!user) return { ok: true }   // silent no-op

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    const tokenHash = await bcrypt.hash(code, 10)
    await this.resets.save(this.resets.create({
      userId:    user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + RESET_TTL_SEC * 1000),
      used:      false,
    }))

    await this.mailer.send(
      user.email,
      'Together — password reset code',
      `Use code ${code} to reset your password. Expires in 30 minutes.`,
    )

    return { ok: true, devCode: this.mailer.isDev() ? code : undefined }
  }

  // Step 2: user submits email + code + newPassword. If valid, we
  // reset the password AND revoke every active session of theirs.
  async reset(email: string, code: string, newPassword: string): Promise<{ ok: true }> {
    const user = await this.users.findOne({ where: { email: email.toLowerCase() } })
    if (!user) throw new BadRequestException('Invalid reset code')

    const rows = await this.resets.find({
      where: { userId: user.id, used: false },
      order: { createdAt: 'DESC' },
    })

    const now = Date.now()
    for (const r of rows) {
      if (r.expiresAt.getTime() < now) continue
      const ok = await bcrypt.compare(code, r.tokenHash)
      if (ok) {
        r.used = true
        await this.resets.save(r)

        user.passwordHash = await bcrypt.hash(newPassword, 10)
        await this.users.save(user)

        // Security: kick out every existing session
        await this.sessions.update({ userId: user.id, revoked: false }, { revoked: true })

        return { ok: true }
      }
    }
    throw new BadRequestException('Invalid or expired reset code')
  }
}