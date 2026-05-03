import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common'
import { TasksRepository } from './tasks.repository'
import { Task, TaskState, VALID_TRANSITIONS } from './entities/task.entity'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { QueryTasksDto } from './dto/query-tasks.dto'
import { Paginated } from '../common/interfaces/paginated.interface'
import { UsersService } from '../users/users.service'
import { TasksGateway } from './tasks.gateway'
import { CommentsService } from '../comments/comments.service'

const DEFAULT_CREATED_BY = 'u1'

@Injectable()
export class TasksService {
  constructor(
    private readonly repo:         TasksRepository,
    private readonly usersService: UsersService,
    // Both are optional so the Bronze unit tests don't wire them.
    @Optional() private readonly gateway?:  TasksGateway,
    @Optional() private readonly comments?: CommentsService,
  ) {}

  findAll(query: QueryTasksDto): Paginated<Task> {
    const page    = query.page    ?? 1
    const perPage = query.perPage ?? 10

    let rows = this.repo.findAll()
    if (query.state)      rows = rows.filter(t => t.state === query.state)
    if (query.priority)   rows = rows.filter(t => t.priority === query.priority)
    if (query.assigneeId) rows = rows.filter(t => t.assigneeId === query.assigneeId)
    if (query.search) {
      const needle = query.search.toLowerCase()
      rows = rows.filter(t => t.title.toLowerCase().includes(needle))
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const total      = rows.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const start      = (page - 1) * perPage
    const items      = rows.slice(start, start + perPage)

    return { items, total, page, perPage, totalPages }
  }

  findOne(id: string): Task {
    const task = this.repo.findById(id)
    if (!task) throw new NotFoundException(`Task ${id} not found`)
    return task
  }

  create(dto: CreateTaskDto): Task {
    this.assertAssigneeExists(dto.assigneeId)
    this.assertDueDateNotInPast(dto.dueDate)

    const task = this.repo.insert({
      title:       dto.title.trim(),
      description: (dto.description ?? '').trim(),
      assigneeId:  dto.assigneeId,
      createdById: DEFAULT_CREATED_BY,
      priority:    dto.priority,
      state:       TaskState.TODO,
      dueDate:     dto.dueDate ?? null,
    })
    this.gateway?.emitTaskCreated(task)
    return task
  }

  update(id: string, dto: UpdateTaskDto): Task {
    this.findOne(id)
    if (dto.assigneeId) this.assertAssigneeExists(dto.assigneeId)

    const patch: Partial<Task> = {}
    if (dto.title !== undefined)       patch.title       = dto.title.trim()
    if (dto.description !== undefined) patch.description = dto.description.trim()
    if (dto.assigneeId !== undefined)  patch.assigneeId  = dto.assigneeId
    if (dto.priority !== undefined)    patch.priority    = dto.priority
    if (dto.dueDate !== undefined)     patch.dueDate     = dto.dueDate ?? null

    const updated = this.repo.update(id, patch)
    if (!updated) throw new NotFoundException(`Task ${id} not found`)
    this.gateway?.emitTaskUpdated(updated)
    return updated
  }

  remove(id: string): void {
    const ok = this.repo.remove(id)
    if (!ok) throw new NotFoundException(`Task ${id} not found`)
    // Cascade: comments on this task go away too.
    this.comments?.cascadeOnTaskDeletion(id)
    this.gateway?.emitTaskDeleted(id)
  }

  setState(id: string, newState: TaskState): Task {
    const task    = this.findOne(id)
    const allowed = VALID_TRANSITIONS[task.state]

    if (!allowed.includes(newState)) {
      throw new BadRequestException(
        `Invalid state transition: ${task.state} → ${newState}. ` +
        `Allowed from ${task.state}: [${allowed.join(', ') || 'none'}]`,
      )
    }

    const updated = this.repo.update(id, { state: newState })
    if (!updated) throw new NotFoundException(`Task ${id} not found`)
    this.gateway?.emitTaskUpdated(updated)
    return updated
  }

  private assertAssigneeExists(assigneeId: string): void {
    if (!this.usersService.exists(assigneeId)) {
      throw new BadRequestException(`Assignee ${assigneeId} does not exist`)
    }
  }

  private assertDueDateNotInPast(dueDate: string | null | undefined): void {
    if (!dueDate) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    if (due < today) {
      throw new BadRequestException('Due date must be today or in the future')
    }
  }
}
