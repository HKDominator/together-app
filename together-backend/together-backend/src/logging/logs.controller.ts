// Destination: together-backend/together-backend/src/logs/logs.controller.ts
import {
  Controller, Get, Param, Patch, Query, UseGuards,
} from '@nestjs/common'
import { LogsService } from './logs.service'
import { AnomalyDetectorService } from './anomaly-detector.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class LogsController {
  constructor(
    private readonly logs:     LogsService,
    private readonly detector: AnomalyDetectorService,
  ) {}

  @Get('logs')
  @RequirePermissions('log.view')
  list(
    @Query('userId')  userId?: string,
    @Query('page')    page?:   string,
    @Query('perPage') perPage?:string,
  ) {
    return this.logs.list({
      userId,
      page:    page    ? Number(page)    : 1,
      perPage: perPage ? Number(perPage) : 50,
    })
  }

  @Get('observation')
  @RequirePermissions('observation.view')
  observation(@Query('all') all?: string) {
    return all === '1' ? this.detector.listAll() : this.detector.listOpen()
  }

  @Patch('observation/:id/resolve')
  @RequirePermissions('observation.view')
  resolve(@Param('id') id: string) {
    return this.detector.resolve(id)
  }
}