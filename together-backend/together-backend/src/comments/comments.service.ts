// Destination: together-backend/together-backend/src/comments/comments.service.ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common'
import { CommentsRepository } from './comments.repository'
import { Comment } from './entities/comment.entity'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { TasksRepository } from '../tasks/tasks.repository'
import { UsersService } from '../users/users.service'
import { UsersRepository } from '../users/users.repository'

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo:      CommentsRepository,
    private readonly tasks:     TasksRepository,
    private readonly users:     UsersService,
    private readonly usersRepo: UsersRepository,
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

  async create(taskId: string, dto: CreateCommentDto): Promise<Comment> {
    await this.assertTaskExists(taskId)
    const author = await this.resolveDefaultAuthor()
    return this.repo.insert({
      taskId,
      authorId: author.id,
      body:     dto.body.trim(),
    })
  }

  async update(id: string, dto: UpdateCommentDto): Promise<Comment> {
    const c = await this.findOne(id)
    const author = await this.resolveDefaultAuthor()
    if (c.authorId !== author.id) {
      throw new ForbiddenException('Only the author can edit this comment')
    }
    if (!dto.body) return c
    const updated = await this.repo.update(id, dto.body.trim())
    if (!updated) throw new NotFoundException(`Comment ${id} not found`)
    return updated
  }

  async remove(id: string): Promise<void> {
    const c = await this.findOne(id)
    const author = await this.resolveDefaultAuthor()
    if (c.authorId !== author.id) {
      throw new ForbiddenException('Only the author can delete this comment')
    }
    await this.repo.remove(id)
  }

  cascadeOnTaskDeletion(taskId: string): Promise<number> {
    return this.repo.removeAllForTask(taskId)
  }

  private async assertTaskExists(taskId: string): Promise<void> {
    const t = await this.tasks.findById(taskId)
    if (!t) throw new NotFoundException(`Task ${taskId} not found`)
  }

  private async resolveDefaultAuthor() {
    const all = await this.usersRepo.findAll()
    const author = all.find(u => u.role === 'owner') ?? all[0]
    if (!author) throw new BadRequestException('No users seeded')
    return author
  }
}