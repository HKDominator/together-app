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
} from '@nestjs/common'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'

/**
 * Comments are always scoped to a task — listing and creation routes
 * are nested under /tasks/:taskId. Edit/delete target a specific
 * comment directly (comment ids are globally unique).
 */
@Controller()
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('tasks/:taskId/comments')
  listForTask(@Param('taskId') taskId: string) {
    return this.comments.listForTask(taskId)
  }

  @Post('tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  create(@Param('taskId') taskId: string, @Body() dto: CreateCommentDto) {
    return this.comments.create(taskId, dto)
  }

  @Patch('comments/:id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentDto) {
    return this.comments.update(id, dto)
  }

  @Delete('comments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.comments.remove(id)
  }
}
