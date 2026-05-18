// Destination: together-backend/src/tasks/tasks.controller.ts
// REPLACE — adds @UseGuards + @RequirePermissions on each method.
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { QueryTasksDto } from './dto/query-tasks.dto'
import { SetStateDto } from './dto/set-state.dto'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('tasks')
@UseGuards(AuthGuard, PermissionsGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @RequirePermissions('task.read')
  findAll(@Query() q: QueryTasksDto) { return this.tasks.findAll(q) }

  @Get(':id')
  @RequirePermissions('task.read')
  findOne(@Param('id') id: string) { return this.tasks.findOne(id) }

  @Post()
  @RequirePermissions('task.create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) { return this.tasks.create(dto) }

  @Patch(':id')
  @RequirePermissions('task.update')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) { return this.tasks.update(id, dto) }

  @Patch(':id/state')
  @RequirePermissions('task.update')
  setState(@Param('id') id: string, @Body() dto: SetStateDto) {
    return this.tasks.setState(id, dto.newState)
  }

  @Delete(':id')
  @RequirePermissions('task.delete')         // 'user' role lacks this → 403
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) { await this.tasks.remove(id) }
}