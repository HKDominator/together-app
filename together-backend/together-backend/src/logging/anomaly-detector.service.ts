// Destination: together-backend/together-backend/src/logging/anomaly-detector.service.ts
// REPLACE THE WHOLE FILE.
//
// CHANGES FROM PRIOR VERSION:
//   - flag() is now PUBLIC (was private). The new AiAnomalyService
//     calls into it directly, reusing the same observation_list and
//     the same admin UI.
//   - evidence type widened to Record<string, unknown> so AI metadata
//     (signal, rationale, model name, full feature vector) fits
//     alongside the heuristic counters.
//   - When an observation already exists and is unresolved, we MERGE
//     evidence ({...existing, ...new}) rather than overwrite. That way
//     a burst-then-AI flag preserves both sets of context.
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ActionLog } from './entities/action-log.entity'
import { Observation } from './entities/observation.entity'
import { User } from '../users/entities/user.entity'

// Heuristic thresholds. Tuned so a normal Ana/Dan session never trips.
const BURST_PER_MIN      = 60
const DELETE_PER_5MIN    = 10
const ERROR4XX_PER_5MIN  = 20

@Injectable()
export class AnomalyDetectorService {
  private readonly log = new Logger(AnomalyDetectorService.name)

  constructor(
    @InjectRepository(ActionLog)   private readonly logs: Repository<ActionLog>,
    @InjectRepository(Observation) private readonly obs:  Repository<Observation>,
    @InjectRepository(User)        private readonly users:Repository<User>,
  ) {}

  /**
   * Called by the LoggingInterceptor on every authenticated request.
   * Runs three cheap heuristics. Each can independently flag a user.
   */
  async observe(userId: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user) return

    await Promise.all([
      this.ruleBurst(user),
      this.ruleDeleteSpree(user),
      this.ruleProbing(user),
    ])
  }

  // ── Rule 1: burst rate ───────────────────────────────────────
  private async ruleBurst(u: User): Promise<void> {
    const since = new Date(Date.now() - 60_000)
    const n = await this.logs.count({
      where: { userId: u.id, createdAt: MoreThan(since) },
    })
    if (n >= BURST_PER_MIN) {
      await this.flag(u, `Burst: ${n} requests in 60s`, { burstPerMin: n })
    }
  }

  // ── Rule 2: delete spree ─────────────────────────────────────
  private async ruleDeleteSpree(u: User): Promise<void> {
    const since = new Date(Date.now() - 5 * 60_000)
    const n = await this.logs.count({
      where: { userId: u.id, method: 'DELETE', createdAt: MoreThan(since) },
    })
    if (n >= DELETE_PER_5MIN) {
      await this.flag(u, `Delete spree: ${n} DELETEs in 5min`, { deletesPer5min: n })
    }
  }

  // ── Rule 3: 4xx probing ──────────────────────────────────────
  private async ruleProbing(u: User): Promise<void> {
    const since = new Date(Date.now() - 5 * 60_000)
    // Inline query — counts only client errors.
    const rows = await this.logs.createQueryBuilder('l')
      .where('l."userId" = :uid', { uid: u.id })
      .andWhere('l."createdAt" >= :since', { since })
      .andWhere('l."statusCode" >= 400 AND l."statusCode" < 500')
      .getCount()
    if (rows >= ERROR4XX_PER_5MIN) {
      await this.flag(u, `Probing: ${rows} 4xx responses in 5min`, { errors4xxPer5min: rows })
    }
  }

  /**
   * Upsert into observation_list. Public so AiAnomalyService can call
   * it with a richer evidence payload. We accept a minimal user shape
   * (not the full User entity) because the AI service already has
   * just the id/email/name when calling.
   */
  async flag(
    user: { id: string; email: string; name: string } | User,
    reason: string,
    evidence: Record<string, unknown>,
  ): Promise<void> {
    const existing = await this.obs.findOne({ where: { userId: user.id, resolved: false } })
    if (existing) {
      existing.score    += 1
      existing.reason    = reason     // keep the most recent reason on top
      existing.evidence  = { ...(existing.evidence ?? {}), ...evidence }
      await this.obs.save(existing)
      return
    }
    await this.obs.save(this.obs.create({
      userId:    user.id,
      userEmail: user.email,
      userName:  user.name,
      reason,
      score:     1,
      resolved:  false,
      evidence,
    }))
  }

  // ── Admin queries ────────────────────────────────────────────
  listOpen() {
    return this.obs.find({ where: { resolved: false }, order: { score: 'DESC' } })
  }
  listAll() {
    return this.obs.find({ order: { flaggedAt: 'DESC' } })
  }
  async resolve(id: string): Promise<{ ok: true }> {
    const o = await this.obs.findOne({ where: { id } })
    if (!o) throw new NotFoundException(`Observation ${id} not found`)
    o.resolved = true
    await this.obs.save(o)
    return { ok: true }
  }
}