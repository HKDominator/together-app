// Destination: together-backend/together-backend/src/comments/comments.service.ts
import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common'
import { CommentsRepository } from './comments.repository'
import { Comment } from './entities/comment.entity'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { TasksRepository } from '../tasks/tasks.repository'
import { UsersService } from '../users/users.service'
import { TasksGateway } from '../tasks/tasks.gateway'

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo:    CommentsRepository,
    private readonly tasks:   TasksRepository,
    private readonly users:   UsersService,
    private readonly gateway: TasksGateway,
  ) {}

  async listForTask(taskId: string): Promise<Comment[]> {
    await this.assertTaskExists(taskId)
    return this.repo.findByTask(taskId)
  }

  async findOne(id: string): Promise<Comment> {
    const c = await this.repo.findById(id)
    if (!c) throw new NotFoundException(`Comment ${id} not found`)
    return c
  }

  countForTask(taskId: string): Promise<number> {
    return this.repo.countByTask(taskId)
  }

  async create(taskId: string, dto: CreateCommentDto, authorId: string): Promise<Comment> {
    await this.assertTaskExists(taskId)
    const comment = await this.repo.insert({ taskId, authorId, body: dto.body.trim() })
    this.gateway.emitCommentCreated(comment)
    return comment
  }

  async update(id: string, dto: UpdateCommentDto, callerId: string): Promise<Comment> {
    const c = await this.findOne(id)
    if (c.authorId !== callerId) {
      throw new ForbiddenException('Only the author can edit this comment')
    }
    if (!dto.body) return c
    const updated = await this.repo.update(id, dto.body.trim())
    if (!updated) throw new NotFoundException(`Comment ${id} not found`)
    this.gateway.emitCommentUpdated(updated)
    return updated
  }

  async remove(id: string, callerId: string): Promise<void> {
    const c = await this.findOne(id)
    if (c.authorId !== callerId) {
      throw new ForbiddenException('Only the author can delete this comment')
    }
    await this.repo.remove(id)
    this.gateway.emitCommentDeleted(id, c.taskId)
  }

  cascadeOnTaskDeletion(taskId: string): Promise<number> {
    return this.repo.removeAllForTask(taskId)
  }

  private async assertTaskExists(taskId: string): Promise<void> {
    const t = await this.tasks.findById(taskId)
    if (!t) throw new NotFoundException(`Task ${taskId} not found`)
  }

}