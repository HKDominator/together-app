import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { TaskGeneratorService } from './task-generator.service'

/**
 * Generator endpoints are grouped under /tasks/generate/* so they sit
 * next to the resource they produce. Kept in a separate controller so
 * TasksController stays focused on CRUD.
 */
@Controller('tasks/generate')
export class GeneratorController {
  constructor(private readonly generator: TaskGeneratorService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start() {
    return this.generator.start()
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  stop() {
    return this.generator.stop()
  }

  @Get('status')
  status() {
    return this.generator.status()
  }
}
