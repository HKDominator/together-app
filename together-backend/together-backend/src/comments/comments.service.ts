import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CommentsRepository } from './comments.repository'
import { Comment } from './entities/comment.entity'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { TasksRepository } from '../tasks/tasks.repository'
import { UsersService } from '../users/users.service'

const DEFAULT_AUTHOR = 'u1'  // hardcoded current user for demo

@Injectable()
export class CommentsService {
  constructor(
    private readonly repo:     CommentsRepository,
    private readonly tasks:    TasksRepository,
    private readonly users:    UsersService,
  ) {}

  // ── Queries ──────────────────────────────────────────────────
  listForTask(taskId: string): Comment[] {
    this.assertTaskExists(taskId)
    return this.repo.findByTask(taskId)
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))  // oldest first → conversation reads top-to-bottom
  }

  findOne(id: string): Comment {
    const c = this.repo.findById(id)
    if (!c) throw new NotFoundException(`Comment ${id} not found`)
    return c
  }

  countForTask(taskId: string): number {
    return this.repo.countByTask(taskId)
  }

  // ── Mutations ────────────────────────────────────────────────
  create(taskId: string, dto: CreateCommentDto): Comment {
    this.assertTaskExists(taskId)
    if (!this.users.exists(DEFAULT_AUTHOR)) {
      throw new BadRequestException(`Author ${DEFAULT_AUTHOR} does not exist`)
    }
    return this.repo.insert({
      taskId,
      authorId: DEFAULT_AUTHOR,
      body:     dto.body.trim(),
    })
  }

  update(id: string, dto: UpdateCommentDto): Comment {
    const c = this.findOne(id)
    // In a real app we'd check `authorId === currentUser`; here we hold
    // the line on that rule anyway so the authorship contract is
    // explicit in the code.
    if (c.authorId !== DEFAULT_AUTHOR) {
      throw new ForbiddenException('Only the author can edit this comment')
    }
    if (!dto.body) return c
    const updated = this.repo.update(id, dto.body.trim())
    if (!updated) throw new NotFoundException(`Comment ${id} not found`)
    return updated
  }

  remove(id: string): void {
    const c = this.findOne(id)
    if (c.authorId !== DEFAULT_AUTHOR) {
      throw new ForbiddenException('Only the author can delete this comment')
    }
    this.repo.remove(id)
  }

  /** Called by TasksService when a task is deleted — cascade. */
  cascadeOnTaskDeletion(taskId: string): number {
    return this.repo.removeAllForTask(taskId)
  }

  // ── Guards ───────────────────────────────────────────────────
  private assertTaskExists(taskId: string): void {
    if (!this.tasks.findById(taskId)) {
      throw new NotFoundException(`Task ${taskId} not found`)
    }
  }
}
