// BUG-13: Abandoned login_attempts and unused password_resets are only
// deleted on their access paths. This service sweeps them hourly so the
// tables don't grow unbounded.
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { LessThan, Repository } from 'typeorm'
import { LoginAttempt } from './entities/login-attempt.entity'
import { PasswordReset } from './entities/password-reset.entity'

@Injectable()
export class AuthCleanupService {
  private readonly log = new Logger(AuthCleanupService.name)

  constructor(
    @InjectRepository(LoginAttempt) private readonly attempts:  Repository<LoginAttempt>,
    @InjectRepository(PasswordReset) private readonly resets:   Repository<PasswordReset>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpired(): Promise<{ attempts: number; resets: number }> {
    const now = new Date()
    const [a, r] = await Promise.all([
      this.attempts.delete({ expiresAt: LessThan(now) }),
      this.resets.delete({ expiresAt: LessThan(now) }),
    ])
    const counts = { attempts: a.affected ?? 0, resets: r.affected ?? 0 }
    if (counts.attempts + counts.resets > 0) {
      this.log.log(`Auth cleanup: removed ${counts.attempts} expired attempts, ${counts.resets} resets`)
    }
    return counts
  }
}
