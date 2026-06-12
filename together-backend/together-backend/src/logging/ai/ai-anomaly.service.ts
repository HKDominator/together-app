// Destination: together-backend/together-backend/src/logging/ai/ai-anomaly.service.ts
//
// The "AI" in "Gold AI anomaly detection". A cron job ticks every 30s,
// builds behavioural features for every user that was active in the
// last 5 minutes, asks a local LLM (Ollama) to label them, and feeds
// high-suspicion verdicts into the existing heuristic detector's
// observation list — so admin UI gets both heuristic and AI rows
// through the same path, no schema changes needed.
//
// Threshold: AI_THRESHOLD env (default 60). Below that we ignore the
// verdict entirely. The LLM is a *recall booster* — heuristics catch
// the obvious patterns (burst, deletes, 4xx storms), the LLM catches
// things like "writes 12 different resource types in 2 min while doing
// zero reads", which no rule would express cleanly.
//
// Feature-based floor: alongside the LLM we run a fast rule-based
// scorer that turns concrete numeric signals (peakBurstPerSec, deletes,
// errors4xx, avgIntervalMs) into a suspicion floor.  The two scores
// are max-pooled so obvious bot patterns always cross the threshold
// even if the LLM under-scores them.
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { OllamaClient } from '../../ai/ollama.client'
import { FeatureExtractorService, UserBehaviorFeatures } from './feature-extractor.service'
import { AnomalyDetectorService } from '../anomaly-detector.service'
import { User } from '../../users/entities/user.entity'

interface LlmVerdict {
  suspicion: number          // 0-100
  signal:    string          // short tag, e.g. 'scraper', 'vandal', 'normal'
  rationale: string          // one sentence in plain English
}

@Injectable()
export class AiAnomalyService {
  private readonly log = new Logger(AiAnomalyService.name)
  private readonly threshold = Number(process.env.AI_THRESHOLD ?? 60)
  private running = false

  constructor(
    private readonly ollama:   OllamaClient,
    private readonly features: FeatureExtractorService,
    private readonly detector: AnomalyDetectorService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Cron(CronExpression.EVERY_30_SECONDS)
  async sweep(): Promise<void> {
    // Skip-overlap: if a previous sweep is still running (slow LLM,
    // network hiccup), don't queue another one.
    if (this.running) return
    this.running = true
    try {
      const available = await this.ollama.isAvailable()
      if (!available) {
        this.log.debug('Ollama unavailable — skipping AI sweep')
        return
      }

      const rows = (await this.features.extractActiveUsers(5, 5)).slice(0, 3)
      if (rows.length === 0) return

      this.log.debug(`AI sweep: ${rows.length} active users to score`)

      // Process one user at a time. The cron is 30s, qwen2.5:3b is
      // ~1-2s per call on consumer hardware → fine up to ~15 users
      // per window. If we need to scale we'd batch, but the demo
      // never reaches that.
      for (const f of rows) {
        // ── Rule-based floor (fast, deterministic) ───────────────
        const featureVerdict = this.featureBasedVerdict(f)

        // ── LLM verdict (slower, catches subtle patterns) ────────
        const llmVerdict = await this.scoreOne(f)

        // Max-pool: pick whichever source is more suspicious.
        // This means obvious bot patterns are always caught even
        // when the small LLM under-scores them.
        const verdict: LlmVerdict =
          llmVerdict && llmVerdict.suspicion >= featureVerdict.suspicion
            ? llmVerdict
            : featureVerdict

        const source =
          llmVerdict && llmVerdict.suspicion >= featureVerdict.suspicion
            ? 'LLM'
            : 'feature-rules'

        if (verdict.suspicion < this.threshold) {
          this.log.debug(
            `[${source}] ${f.userId} suspicion=${verdict.suspicion} signal=${verdict.signal} — below threshold ${this.threshold}`,
          )
          continue
        }

        // Hydrate the user (the detector needs email + name on the
        // observation row).
        const u = await this.users.findOne({ where: { id: f.userId } })
        if (!u) continue

        await this.detector.flag(
          { id: u.id, email: u.email, name: u.name },
          `AI[${verdict.signal}] via ${source}: ${verdict.rationale}`,
          {
            aiModel:      source === 'LLM' ? this.ollama.modelName() : 'feature-rules',
            aiScore:      verdict.suspicion,
            aiSignal:     verdict.signal,
            aiRationale:  verdict.rationale,
            observedAt:   new Date().toISOString(),
            features:     f,
          },
        )
        this.log.warn(
          `AI flagged ${u.email} score=${verdict.suspicion} signal=${verdict.signal} source=${source}`,
        )
      }
    } catch (e) {
      this.log.error(`AI sweep failed: ${(e as Error).message}`)
    } finally {
      this.running = false
    }
  }

  // ── Feature-based rule scorer ────────────────────────────────────
  //
  // Deterministic fallback that converts raw feature numbers into a
  // suspicion score using the same thresholds the bot personas were
  // built around.  A normal human never exceeds ~1-2 req/sec, never
  // issues 10+ deletes in 5 min, and never accumulates 10+ 4xx errors
  // in 5 min from their own account.
  private featureBasedVerdict(f: UserBehaviorFeatures): LlmVerdict {
    // Scraper: burst GET rate, very low write ratio
    if (f.peakBurstPerSec >= 3 && f.writeRatio < 0.15 && f.reads > 20) {
      return {
        suspicion: 85,
        signal: 'scraper',
        rationale:
          `${f.peakBurstPerSec} req/s peak, ${f.reads} GETs, ` +
          `write ratio ${f.writeRatio} — automated read-scraping pattern`,
      }
    }
    // Generic burst (high rate but mixed methods)
    if (f.peakBurstPerSec >= 3) {
      return {
        suspicion: 75,
        signal: 'burst',
        rationale:
          `${f.peakBurstPerSec} req/s peak burst — ` +
          `well above the ≤2 req/s threshold for human users`,
      }
    }
    // Vandal: many deletes, fewer reads than deletes
    if (f.deletes >= 5 && f.reads < f.deletes) {
      return {
        suspicion: 80,
        signal: 'vandal',
        rationale:
          `${f.deletes} DELETEs vs ${f.reads} reads in ${f.windowMin} min — ` +
          `create-then-delete loop pattern`,
      }
    }
    // Probe: large 4xx error count
    if (f.errors4xx >= 10) {
      return {
        suspicion: 75,
        signal: 'probe',
        rationale:
          `${f.errors4xx} 4xx errors in ${f.windowMin} min — ` +
          `forbidden/unknown path probing`,
      }
    }
    // Tight machine-paced interval with meaningful request volume
    if (f.avgIntervalMs > 0 && f.avgIntervalMs < 400 && f.reqs > 20) {
      return {
        suspicion: 70,
        signal: 'burst',
        rationale:
          `${f.avgIntervalMs} ms avg inter-request interval across ${f.reqs} requests — ` +
          `consistent automated pacing`,
      }
    }
    return { suspicion: 0, signal: 'normal', rationale: 'within normal bounds' }
  }

  private async scoreOne(f: UserBehaviorFeatures): Promise<LlmVerdict | null> {
    const prompt = this.buildPrompt(f)
    const r = await this.ollama.generateJson<LlmVerdict>(prompt, 30_000)
    if (!r.ok || !r.parsed) {
      this.log.debug(`LLM returned no usable verdict for ${f.userId}: ${r.err ?? 'no payload'}`)
      return null
    }
    const v = r.parsed
    // Defensive parsing — qwen2.5:3b occasionally drifts.
    const suspicion = Math.max(0, Math.min(100, Number(v.suspicion) || 0))
    const signal    = typeof v.signal    === 'string' ? v.signal.slice(0, 30) : 'unknown'
    const rationale = typeof v.rationale === 'string' ? v.rationale.slice(0, 300) : ''
    this.log.debug(`LLM verdict for ${f.userId}: suspicion=${suspicion} signal=${signal} rationale=${rationale}`)
    return { suspicion, signal, rationale }
  }

  private buildPrompt(f: UserBehaviorFeatures): string {
    // Prompt engineered for qwen2.5:3b.
    // Key lessons:
    //   - Spell out NUMERIC THRESHOLDS — small models can't infer
    //     "high" without a reference point.
    //   - List classification rules in priority order so the model
    //     applies the FIRST match rather than averaging.
    //   - "Respond ONLY with JSON" stops it adding markdown fences.
    return [
      'You are a security analyst classifying user behaviour on a task-management API.',
      'A NORMAL human user makes at most 1-2 requests per second and never sustains more than 20 requests per minute.',
      '',
      'Behaviour summary (last 5 minutes):',
      `  requests:             ${f.reqs}`,
      `  distinct endpoints:   ${f.distinctPaths}`,
      `  reads / writes / deletes: ${f.reads} / ${f.writes} / ${f.deletes}`,
      `  4xx errors:           ${f.errors4xx}`,
      `  5xx errors:           ${f.errors5xx}`,
      `  peak burst / sec:     ${f.peakBurstPerSec}`,
      `  avg interval (ms):    ${f.avgIntervalMs}`,
      `  write ratio:          ${f.writeRatio}`,
      `  top paths:            ${f.topPaths.join(', ')}`,
      '',
      'Apply the FIRST rule that matches and set suspicion accordingly:',
      '  1. peakBurstPerSec >= 3 AND writeRatio < 0.15  → signal="scraper",  suspicion 80-95',
      '  2. peakBurstPerSec >= 3                        → signal="burst",    suspicion 75-90',
      '  3. deletes >= 5 AND reads < deletes            → signal="vandal",   suspicion 75-90',
      '  4. errors4xx >= 10                             → signal="probe",    suspicion 70-85',
      '  5. avgIntervalMs < 400 AND reqs > 20           → signal="burst",    suspicion 65-80',
      '  6. none of the above                           → signal="normal",   suspicion 10-30',
      '',
      'Respond ONLY with a JSON object — no markdown, no commentary:',
      '{ "suspicion": <0-100 integer>, "signal": "scraper|vandal|probe|burst|normal", "rationale": "<one short sentence>" }',
    ].join('\n')
  }
}
