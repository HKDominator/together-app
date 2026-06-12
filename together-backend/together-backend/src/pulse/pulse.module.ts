// Destination: together-backend/together-backend/src/pulse/pulse.module.ts
// Wave 5 (FD-16 / ADR-0004): Couple Pulse.
//
// Firewall note (ADR-0004): this module must never be imported by
// StatsModule (no Pulse data in analytics) and must never import
// TasksModule/ChatModule/StatsModule (no task, chat, or statistics data
// anywhere near Pulse). It consumes UsersModule for identity and — from
// step 5 — AiModule for the suggestion pipeline. REST only; no GraphQL
// resolver, no gateway hook.
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PulseCheckIn } from './entities/pulse-check-in.entity'
import { PulseDay } from './entities/pulse-day.entity'
import { PulseService } from './pulse.service'
import { PulseSuggestionService } from './pulse-suggestion.service'
import { UsersModule } from '../users/users.module'
import { AiModule } from '../ai/ai.module'

@Module({
  imports:   [TypeOrmModule.forFeature([PulseCheckIn, PulseDay]), UsersModule, AiModule],
  providers: [PulseService, PulseSuggestionService],
  exports:   [PulseService],
})
export class PulseModule {}
