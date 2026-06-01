// Destination: together-backend/together-backend/src/stats/tag-affinity.controller.ts
//
// Three sibling endpoints with identical contracts but very different
// hot-path costs. This is what JMeter compares.
import {
  Controller, Get, Param, Post, Query, UseGuards,
} from '@nestjs/common'
import { TagAffinityService } from './tag-affinity.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('stats/tag-affinity')
@UseGuards(AuthGuard)
export class TagAffinityController {
  constructor(private readonly svc: TagAffinityService) {}

  // GET /api/stats/tag-affinity/naive?days=90
  @Get('naive')
  naive(@Query('days') days?: string) {
    return this.svc.naive(days ? Number(days) : 90)
  }

  // GET /api/stats/tag-affinity/sql?days=90
  @Get('sql')
  sql(@Query('days') days?: string) {
    return this.svc.sql(days ? Number(days) : 90)
  }

  // GET /api/stats/tag-affinity/cached?days=90
  @Get('cached')
  cached(@Query('days') days?: string) {
    return this.svc.cached(days ? Number(days) : 90)
  }

  // GET /api/stats/tag-affinity/explain — Postgres execution plan
  @Get('explain')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('log.view')
  explain(@Query('days') days?: string) {
    return this.svc.explain(days ? Number(days) : 90)
  }

  // POST /api/stats/tag-affinity/invalidate — drop cache (admin)
  @Post('invalidate')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('user.manage')
  invalidate() { return this.svc.invalidate() }

  // POST /api/stats/tag-affinity/refresh — re-run matview (admin)
  @Post('refresh')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('user.manage')
  refresh() { return this.svc.refreshMatview() }
}