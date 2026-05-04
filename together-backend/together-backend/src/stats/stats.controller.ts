// Destination: together-backend/together-backend/src/stats/stats.controller.ts
// REPLACE — now exposes /stats and /stats/user/:id (the SP-backed one).
import { Controller, Get, Param } from '@nestjs/common'
import { StatsService } from './stats.service'

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  get() { return this.stats.compute() }

  /** SP-backed: GET /api/stats/user/:id → calls get_user_task_stats(uuid) */
  @Get('user/:id')
  getUserStats(@Param('id') id: string) {
    return this.stats.getUserStats(id)
  }
}