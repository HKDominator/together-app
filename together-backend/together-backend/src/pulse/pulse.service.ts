// Destination: together-backend/together-backend/src/pulse/pulse.service.ts
// Wave 5 (FD-16 / ADR-0004): PulseService core — Check-in upsert and the
// per-caller today view.
//
// Reveal-after-you-share lives HERE, not in the UI: the partner's
// check-in content never enters the serialized view until the caller
// has checked in, so no client bug can leak it. A one-sided day has no
// reading/suggestion fields at all — absence, never a partial score.
//
// Today-only by construction: every write targets the current Pulse Day
// computed server-side, so past days are immutable without any
// "is editable" bookkeeping.
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PulseCheckIn } from './entities/pulse-check-in.entity'
import { PulseDay } from './entities/pulse-day.entity'
import { PulseSuggestionService } from './pulse-suggestion.service'
import { pulseDayFor } from './pulse-day.util'
import { CheckInValues, computeReading, READINGS, ReadingKey } from './reading'
import { UsersService } from '../users/users.service'

export interface PulseTodayView {
  pulseDay: string
  you: CheckInValues | null
  partner: {
    name:         string
    hasCheckedIn: boolean
    checkIn:      CheckInValues | null
  }
  // Present only when both check-ins exist (state d). On solo or empty
  // days the keys are absent, not null — a missing Sync Score is an
  // absence, never a zero.
  reading?:    { key: ReadingKey; label: string }
  suggestion?: string | null
}

const isUniqueViolation = (e: unknown): boolean =>
  (e as { code?: string })?.code === '23505' ||
  (e as { driverError?: { code?: string } })?.driverError?.code === '23505'

@Injectable()
export class PulseService {
  private readonly timeZone: string

  constructor(
    @InjectRepository(PulseCheckIn) private readonly checkIns: Repository<PulseCheckIn>,
    @InjectRepository(PulseDay)     private readonly days:     Repository<PulseDay>,
    private readonly suggestions: PulseSuggestionService,
    private readonly users: UsersService,
    cfg: ConfigService,
  ) {
    this.timeZone = cfg.get<string>('PULSE_TIMEZONE', 'Europe/Bucharest')
  }

  currentPulseDay(now: Date = new Date()): string {
    return pulseDayFor(now, this.timeZone)
  }

  /** Create or update the caller's Check-in for the current Pulse Day. */
  async upsertCheckIn(userId: string, values: CheckInValues): Promise<PulseTodayView> {
    const pulseDay = this.currentPulseDay()
    const existing = await this.checkIns.findOne({ where: { userId, pulseDay } })

    if (existing) {
      await this.checkIns.save({ ...existing, ...values })
    } else {
      try {
        await this.checkIns.save(this.checkIns.create({ userId, pulseDay, ...values }))
      } catch (e) {
        if (!isUniqueViolation(e)) throw e
        // Lost the (userId, pulseDay) unique race against our own
        // concurrent request — the row exists now; update the winner.
        const winner = await this.checkIns.findOne({ where: { userId, pulseDay } })
        if (winner) await this.checkIns.save({ ...winner, ...values })
      }
    }

    // If this write completed the day, generate the suggestion now —
    // awaited (bounded budget, approved 2026-06-12) so the reveal moment
    // arrives whole: Reading and suggestion together. ensureSuggestion
    // is idempotent, so an edit after completion never regenerates.
    const allUsers    = await this.users.findAll()
    const partnerUser = allUsers.find(u => u.id !== userId)
    const partnerRow  = partnerUser
      ? await this.checkIns.findOne({ where: { userId: partnerUser.id, pulseDay } })
      : null
    if (partnerUser && partnerRow) {
      await this.suggestions.ensureSuggestion({
        pulseDay,
        reading: computeReading(values, { mood: partnerRow.mood, energy: partnerRow.energy }),
        partners: [
          { name: allUsers.find(u => u.id === userId)?.name ?? '', ...values },
          { name: partnerUser.name, mood: partnerRow.mood, energy: partnerRow.energy },
        ],
      })
    }
    return this.getToday(userId)
  }

  /** The per-caller view of the current Pulse Day. */
  async getToday(callerId: string): Promise<PulseTodayView> {
    const pulseDay = this.currentPulseDay()
    const [allUsers, rows, dayRow] = await Promise.all([
      this.users.findAll(),
      this.checkIns.find({ where: { pulseDay } }),
      this.days.findOne({ where: { pulseDay } }),
    ])

    const partnerUser = allUsers.find(u => u.id !== callerId)
    const own         = rows.find(r => r.userId === callerId) ?? null
    const partnerRow  = partnerUser ? rows.find(r => r.userId === partnerUser.id) ?? null : null

    const view: PulseTodayView = {
      pulseDay,
      you: own ? { mood: own.mood, energy: own.energy } : null,
      partner: {
        name:         partnerUser?.name ?? '',
        hasCheckedIn: partnerRow !== null,
        // Reveal-after-you-share: content only once the caller shared.
        checkIn: own && partnerRow
          ? { mood: partnerRow.mood, energy: partnerRow.energy }
          : null,
      },
    }

    if (own && partnerRow) {
      const key = computeReading(
        { mood: own.mood,        energy: own.energy },
        { mood: partnerRow.mood, energy: partnerRow.energy },
      )
      view.reading = { key, label: READINGS[key] }
      // Lazy repair: a completed day with no stored row (crash between
      // commit and generation) gets the deterministic Canon pick via the
      // same conditional insert — the slot is never empty on a completed
      // day. Only the stored text crosses the boundary; suggestionSource
      // and canonEntryId stay server-side (invisible degradation).
      const stored = dayRow ?? await this.suggestions.repairSuggestion(pulseDay, key)
      view.suggestion = stored?.suggestionText ?? null
    }
    return view
  }
}
