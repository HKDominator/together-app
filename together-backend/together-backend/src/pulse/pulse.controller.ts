// Destination: together-backend/together-backend/src/pulse/pulse.controller.ts
// Wave 5 Step 6 (FD-16 / ADR-0004): REST surface for Couple Pulse.
//
// AuthGuard only — no PermissionsGuard, no new permission rows (matches
// StatsController). Identity always from req.user.id, never from the
// payload. REST only — no GraphQL resolver, no gateway/WS events.
import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { PulseService } from './pulse.service'
import { UpsertCheckInDto } from './dto/upsert-check-in.dto'
import { AuthGuard } from '../auth/guards/auth.guard'

@Controller('pulse')
@UseGuards(AuthGuard)
export class PulseController {
  constructor(private readonly pulse: PulseService) {}

  @Get('today')
  getToday(@Req() req: Request & { user: { id: string } }) {
    return this.pulse.getToday(req.user.id)
  }

  @Put('today/check-in')
  checkIn(
    @Body() dto: UpsertCheckInDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.pulse.upsertCheckIn(req.user.id, dto)
  }
}
