// Destination: together-backend/together-backend/src/logs/anomaly-detector.service.ts
// Heuristics-based. Three rules — easy to extend:
//   1. Burst rate     : > 60 requests in the last 60s
//   2. Delete spree   : > 10 DELETEs in the last 5 minutes
//   3. Repeated 4xx   : > 20 client errors in the last 5 minutes (probing)
//
// On a hit, upsert into observation_list with a reason and bumped score.
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ActionLog } from './entities/action-log.entity'
import { Observation } from './entities/observation.entity'
import { LogsService } from './logs.service'
import { User } from '../users/entities/user.entity'

const ONE_MIN_MS  = 60_000
const FIVE_MIN_MS = 5 * ONE_MIN_MS

const RULES = {
  BURST_THRESHOLD:    60,   // req / minute
  DELETE_THRESHOLD:   10,   // deletes / 5 min
  ERROR_THRESHOLD:    20,   // 4xx / 5 min
}

@Injectable()
export class AnomalyDetectorService {
  private readonly log = new Logger(AnomalyDetectorService.name)

  constructor(
    private readonly logs:        LogsService,
    @InjectRepository(Observation) private readonly observations: Repository<Observation>,
    @InjectRepository(ActionLog)   private readonly actionLogs:   Repository<ActionLog>,
    @InjectRepository(User)        private readonly users:        Repository<User>,
  ) {}

  /** Called after each insert by the interceptor. Cheap — just three counts. */
  async check(latest: ActionLog): Promise<void> {
    if (!latest.userId) return

    const reasons: string[] = []
    const evidence: Record<string, number> = {}

    const burst = await this.logs.countSince(latest.userId, ONE_MIN_MS)
    evidence.requestsLastMin = burst
    if (burst > RULES.BURST_THRESHOLD) {
      reasons.push(`Burst rate: ${burst} requests in last 60s`)
    }

    if (latest.method === 'DELETE') {
      const deletes = await this.actionLogs.createQueryBuilder('l')
        .where('l.userId = :u', { u: latest.userId })
        .andWhere('l.method = :m', { m: 'DELETE' })
        .andWhere('l.createdAt > :since', { since: new Date(Date.now() - FIVE_MIN_MS) })
        .getCount()
      evidence.deletesLast5Min = deletes
      if (deletes > RULES.DELETE_THRESHOLD) {
        reasons.push(`Delete spree: ${deletes} deletes in last 5 min`)
      }
    }

    if (latest.statusCode >= 400 && latest.statusCode < 500) {
      const errors = await this.actionLogs.createQueryBuilder('l')
        .where('l.userId = :u', { u: latest.userId })
        .andWhere('l.statusCode >= 400 AND l.statusCode < 500')
        .andWhere('l.createdAt > :since', { since: new Date(Date.now() - FIVE_MIN_MS) })
        .getCount()
      evidence.clientErrorsLast5Min = errors
      if (errors > RULES.ERROR_THRESHOLD) {
        reasons.push(`Probing: ${errors} 4xx responses in last 5 min`)
      }
    }

    if (reasons.length === 0) return
    await this.flag(latest.userId, reasons.join('; '), evidence)
  }

  private async flag(userId: string, reason: string, evidence: Record<string, number>) {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) return

    const existing = await this.observations.findOne({ where: { userId } })
    if (existing && !existing.resolved) {
      existing.score   += 1
      existing.reason   = reason
      existing.evidence = evidence
      await this.observations.save(existing)
    } else {
      await this.observations.save(this.observations.create({
        userId,
        userEmail: user.email,
        userName:  user.name,
        reason, evidence, score: 1, resolved: false,
      }))
    }
    this.log.warn(`🚨 flagged user ${user.email}: ${reason}`)
  }

  // Admin actions
  async listOpen() {
    return this.observations.find({ where: { resolved: false }, order: { flaggedAt: 'DESC' } })
  }
  async listAll() {
    return this.observations.find({ order: { flaggedAt: 'DESC' } })
  }
  async resolve(id: string) {
    await this.observations.update(id, { resolved: true })
    return { ok: true }
  }
}