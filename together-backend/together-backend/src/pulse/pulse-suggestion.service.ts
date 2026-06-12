// Destination: together-backend/together-backend/src/pulse/pulse-suggestion.service.ts
// Wave 5 (FD-16 / ADR-0004): the Suggested shared activity pipeline.
//
// The LLM has exactly ONE job in Couple Pulse: pick the best-fitting
// Curated Canon candidate for the computed Reading and rephrase it
// warmly. It never invents an activity and never touches the Reading.
// Every failure mode — Ollama down, HTTP error, timeout, unparseable
// JSON, output that fails validation, even an unexpected throw — lands
// on the deterministic Canon pick through the same conditional store,
// so degradation is invisible: same column, same response shape, no
// banner, no retry. If Ollama recovers later, today's stored
// suggestion stands (regenerating would swap content the couple may
// already be acting on).
//
// Prompt inputs, exhaustively: both Check-ins, the Reading, both first
// names, local time-of-day and day-of-week, and the candidates for the
// Reading. No task, chat, or statistics data — ever (the tasks→pulse
// firewall, mirror of the pulse→stats one).
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PulseDay, SuggestionSource } from './entities/pulse-day.entity'
import { OllamaClient } from '../ai/ollama.client'
import { CANON, CanonEntry, pickCanonEntry } from './canon'
import { Mood, Energy, READINGS, ReadingKey } from './reading'

// The completing check-in awaits this budget (approved 2026-06-12).
// The down case never gets here: isAvailable() fast-fails in <=2s via
// its own cached health check.
export const GENERATION_TIMEOUT_MS = 8_000

const SUGGESTION_TEXT_MAX = 200

export interface PartnerCheckIn {
  name:   string
  mood:   Mood
  energy: Energy
}

export interface SuggestionContext {
  pulseDay: string
  reading:  ReadingKey
  partners: PartnerCheckIn[]
}

interface LlmSuggestion {
  choiceId: string
  text:     string
}

@Injectable()
export class PulseSuggestionService {
  private readonly log = new Logger(PulseSuggestionService.name)
  private readonly timeZone: string

  constructor(
    @InjectRepository(PulseDay) private readonly days: Repository<PulseDay>,
    private readonly ollama: OllamaClient,
    cfg: ConfigService,
  ) {
    this.timeZone = cfg.get<string>('PULSE_TIMEZONE', 'Europe/Bucharest')
  }

  /**
   * Generate-once-per-Pulse-Day, called when the second Check-in lands.
   * Idempotent: an already-stored suggestion is returned untouched and
   * Ollama is never consulted again for that day.
   */
  async ensureSuggestion(ctx: SuggestionContext): Promise<PulseDay | null> {
    const existing = await this.days.findOne({ where: { pulseDay: ctx.pulseDay } })
    if (existing) return existing

    const canon = pickCanonEntry(ctx.pulseDay, ctx.reading)
    const tailored = await this.tryTailor(ctx)

    return tailored
      ? this.storeIfAbsent(ctx, tailored.text, 'llm', tailored.choiceId)
      : this.storeIfAbsent(ctx, canon.text, 'canon', canon.id)
  }

  /**
   * Lazy repair for the read path: a completed day with no stored row
   * (crash between commit and generation) gets the deterministic Canon
   * pick — never the LLM, so a page load can never block on a model.
   */
  async repairSuggestion(pulseDay: string, reading: ReadingKey): Promise<PulseDay | null> {
    const canon = pickCanonEntry(pulseDay, reading)
    return this.storeIfAbsent({ pulseDay, reading }, canon.text, 'canon', canon.id)
  }

  // ── LLM path ─────────────────────────────────────────────────────

  private async tryTailor(ctx: SuggestionContext): Promise<LlmSuggestion | null> {
    try {
      if (!(await this.ollama.isAvailable())) return null

      const candidates = CANON[ctx.reading]
      const r = await this.ollama.generateJson<LlmSuggestion>(
        this.buildPrompt(ctx, candidates),
        GENERATION_TIMEOUT_MS,
      )
      if (!r.ok || !r.parsed) {
        this.log.debug(`suggestion LLM unusable for ${ctx.pulseDay}: ${r.err ?? 'no payload'}`)
        return null
      }
      return this.validate(r.parsed, candidates)
    } catch (e) {
      this.log.debug(`suggestion LLM threw for ${ctx.pulseDay}: ${(e as Error).message}`)
      return null
    }
  }

  // Defensive validation — anything malformed serves the Canon entry
  // directly. The no-digits check is the mechanical enforcement of the
  // surface-wide no-numerals boundary (Canon entries are digit-free by
  // authorship; the model must not reintroduce them).
  private validate(v: LlmSuggestion, candidates: readonly CanonEntry[]): LlmSuggestion | null {
    if (typeof v.choiceId !== 'string' || !candidates.some(c => c.id === v.choiceId)) return null
    if (typeof v.text !== 'string') return null
    const text = v.text.trim()
    if (text.length === 0 || text.length > SUGGESTION_TEXT_MAX) return null
    if (/\d/.test(text)) return null
    return { choiceId: v.choiceId, text }
  }

  private buildPrompt(ctx: SuggestionContext, candidates: readonly CanonEntry[]): string {
    const now = new Date()
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone: this.timeZone, weekday: 'long' }).format(now)
    const hour = Number(new Intl.DateTimeFormat('en-US', {
      timeZone: this.timeZone, hour: 'numeric', hourCycle: 'h23',
    }).format(now))
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 22 ? 'evening' : 'night'

    // Same prompt discipline as the anomaly service's buildPrompt:
    // explicit rules, priority order, "respond ONLY with JSON".
    return [
      'You help a couple end their day with one small shared activity.',
      'Pick the SINGLE best-fitting candidate from the list and rephrase it warmly.',
      '',
      'Rules, in priority order:',
      '  1. You must choose one of the listed candidates. Never invent a new activity.',
      '  2. Phrase it as a gentle invitation, never an instruction or advice.',
      '  3. One or two short sentences. No digits. No emojis. No exclamation marks.',
      '  4. You may weave in a first name or the time of day if it feels natural.',
      '  5. Never mention tasks, chores, productivity, or anything to improve.',
      '',
      'Tonight:',
      `  ${ctx.partners.map(p => `${p.name} feels ${p.mood}, energy ${p.energy}.`).join('\n  ')}`,
      `  Their shared reading: ${READINGS[ctx.reading]}.`,
      `  It is ${weekday} ${timeOfDay}.`,
      '',
      'Candidates:',
      ...candidates.map(c => `  - id: ${c.id} | ${c.text}`),
      '',
      'Respond ONLY with a JSON object, no markdown, no commentary:',
      '{ "choiceId": "<one of the candidate ids>", "text": "<the invitation, rephrased warmly>" }',
    ].join('\n')
  }

  // ── Conditional store: first writer wins, never overwritten ──────

  private async storeIfAbsent(
    ctx: { pulseDay: string; reading: ReadingKey },
    suggestionText: string,
    suggestionSource: SuggestionSource,
    canonEntryId: string,
  ): Promise<PulseDay | null> {
    await this.days.createQueryBuilder()
      .insert()
      .into(PulseDay)
      .values({
        pulseDay: ctx.pulseDay,
        suggestionText,
        suggestionSource,
        canonEntryId,
        readingAtGeneration: ctx.reading,
      })
      .orIgnore() // Postgres: ON CONFLICT DO NOTHING on the unique pulseDay
      .execute()

    // Read back rather than trusting our own write — if a concurrent
    // writer won the conflict, theirs is the day's suggestion.
    return this.days.findOne({ where: { pulseDay: ctx.pulseDay } })
  }
}
