import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common'
import { TaskGeneratorService } from './task-generator.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

/**
 * Generator endpoints are grouped under /tasks/generate/* so they sit
 * next to the resource they produce. Kept in a separate controller so
 * TasksController stays focused on CRUD.
 *
 * SEC-05: these spawn/stop bulk task generation, so they are gated like the
 * rest of the API — AuthGuard + PermissionsGuard — behind `task.delete`, the
 * admin-only task-domain permission (the `user` role lacks it). An
 * unauthenticated or non-admin caller can no longer pollute data or exhaust
 * resources.
 */
@Controller('tasks/generate')
@UseGuards(AuthGuard, PermissionsGuard)
export class GeneratorController {
  constructor(private readonly generator: TaskGeneratorService) {}

  @Post('start')
  @RequirePermissions('task.delete')
  @HttpCode(HttpStatus.OK)
  start() {
    return this.generator.start()
  }

  @Post('stop')
  @RequirePermissions('task.delete')
  @HttpCode(HttpStatus.OK)
  stop() {
    return this.generator.stop()
  }

  @Get('status')
  @RequirePermissions('task.delete')
  status() {
    return this.generator.status()
  }
}
