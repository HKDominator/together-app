// Destination: together-backend/together-backend/src/logging/ai/feature-extractor.service.ts
//
// Reads recent action_logs and produces a compact per-user behavioural
// vector that's cheap to send to the LLM. The features were chosen to
// distinguish the bot personas we're attacking with:
//   - peakBurstPerSec   → scraper (fires 6 req/sec)
//   - deletes           → vandal  (create + immediately delete)
//   - errors4xx         → probe   (hits forbidden endpoints)
//   - writeRatio + reqs → normal user (low rate, mixed reads/writes)
//
// We deliberately keep this small — the LLM prompt budget is tight,
// and most of the diagnostic power comes from 4-5 well-chosen features.
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, MoreThan } from 'typeorm'
import { ActionLog } from '../entities/action-log.entity'

export interface UserBehaviorFeatures {
  userId:           string
  windowMin:        number
  reqs:             number
  distinctPaths:    number
  reads:            number
  writes:           number
  deletes:          number
  errors4xx:        number
  errors5xx:        number
  peakBurstPerSec:  number
  avgIntervalMs:    number
  writeRatio:       number   // 0..1
  topPaths:         string[] // up to 3, query strings stripped
}

@Injectable()
export class FeatureExtractorService {
  constructor(
    @InjectRepository(ActionLog) private readonly logs: Repository<ActionLog>,
  ) {}

  /**
   * Look back `windowMin` minutes; emit one feature row per user that
   * issued at least `minReqs` requests in that window.
   */
  async extractActiveUsers(windowMin = 5, minReqs = 5): Promise<UserBehaviorFeatures[]> {
    const since = new Date(Date.now() - windowMin * 60_000)
    const rows = await this.logs.find({
      where: { createdAt: MoreThan(since) },
      order: { createdAt: 'ASC' },
    })

    // Bucket by userId. Anonymous traffic (userId === null) is skipped
    // because we can't act on it — observation_list is keyed by userId.
    const byUser = new Map<string, ActionLog[]>()
    for (const r of rows) {
      if (!r.userId) continue
      let bucket = byUser.get(r.userId)
      if (!bucket) { bucket = []; byUser.set(r.userId, bucket) }
      bucket.push(r)
    }

    const out: UserBehaviorFeatures[] = []
    for (const [userId, rs] of byUser) {
      if (rs.length < minReqs) continue
      out.push(this.summarize(userId, rs, windowMin))
    }
    return out
  }

  private summarize(userId: string, rs: ActionLog[], windowMin: number): UserBehaviorFeatures {
    const reqs = rs.length

    // Strip ids and query strings from paths for cardinality control.
    const normalize = (p: string) =>
      p.split('?')[0].replace(/\/[0-9a-f-]{8,}/gi, '/:id')

    const pathSet = new Set<string>()
    const pathCount = new Map<string, number>()
    let reads = 0, writes = 0, deletes = 0
    let errors4xx = 0, errors5xx = 0

    for (const r of rs) {
      const n = normalize(r.path)
      pathSet.add(n)
      pathCount.set(n, (pathCount.get(n) ?? 0) + 1)
      const m = r.method.toUpperCase()
      if (m === 'GET') reads++
      else if (m === 'DELETE') deletes++
      else writes++
      if (r.statusCode >= 400 && r.statusCode < 500) errors4xx++
      else if (r.statusCode >= 500) errors5xx++
    }

    // Peak burst: max requests in any 1-second bucket. Captures
    // scrapers cleanly; normal users never exceed ~2/sec from typing.
    const bucketCounts = new Map<number, number>()
    for (const r of rs) {
      const sec = Math.floor(r.createdAt.getTime() / 1000)
      bucketCounts.set(sec, (bucketCounts.get(sec) ?? 0) + 1)
    }
    const peakBurstPerSec = Math.max(...bucketCounts.values(), 0)

    // Avg inter-request interval — tight for bots, loose for humans.
    let avgIntervalMs = 0
    if (rs.length > 1) {
      let sum = 0
      for (let i = 1; i < rs.length; i++) {
        sum += rs[i].createdAt.getTime() - rs[i - 1].createdAt.getTime()
      }
      avgIntervalMs = Math.round(sum / (rs.length - 1))
    }

    const topPaths = [...pathCount.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([p]) => p)

    return {
      userId,
      windowMin,
      reqs,
      distinctPaths:   pathSet.size,
      reads, writes, deletes,
      errors4xx, errors5xx,
      peakBurstPerSec,
      avgIntervalMs,
      writeRatio:      Math.round(((writes + deletes) / reqs) * 100) / 100,
      topPaths,
    }
  }
}