// Destination: together-backend/src/comments/comments.controller.ts
// REPLACE — gate comment CRUD behind permissions.
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Patch, Post, Req, UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller()
@UseGuards(AuthGuard, PermissionsGuard)
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get('tasks/:taskId/comments')
  @RequirePermissions('task.read')
  listForTask(@Param('taskId') taskId: string) {
    return this.comments.listForTask(taskId)
  }

  @Post('tasks/:taskId/comments')
  @RequirePermissions('comment.create')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('taskId') taskId: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.comments.create(taskId, dto, req.user.id)
  }

  @Patch('comments/:id')
  @RequirePermissions('comment.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.comments.update(id, dto, req.user.id)
  }

  @Delete('comments/:id')
  @RequirePermissions('comment.delete')      // 'user' role lacks this
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string } },
  ): Promise<void> {
    await this.comments.remove(id, req.user.id)
  }
}