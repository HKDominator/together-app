import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { QueryTasksDto } from './dto/query-tasks.dto'
import { SetStateDto } from './dto/set-state.dto'

/**
 * Controller = HTTP boundary only. No business logic lives here —
 * it deserialises/validates the request (DTOs), calls the service,
 * and shapes the response. Per the Bronze requirement to "separate
 * the end points from the rest of the implementation".
 */
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  findAll(@Query() query: QueryTasksDto) {
    return this.tasks.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasks.findOne(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateTaskDto) {
    return this.tasks.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto)
  }

  @Patch(':id/state')
  setState(@Param('id') id: string, @Body() dto: SetStateDto) {
    return this.tasks.setState(id, dto.newState)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    this.tasks.remove(id)
  }
}
