// FD-06: dual-presence state. Stateful singleton — one instance holds the
// live connection/viewing maps for the whole process (ADR-0003 single-tenant).
import { Module } from '@nestjs/common'
import { PresenceService } from './presence.service'

@Module({
  providers: [PresenceService],
  exports:   [PresenceService],
})
export class PresenceModule {}
