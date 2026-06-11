// Destination: together-backend/together-backend/src/tasks/tasks.service.ts
import {
  BadRequestException, ConflictException, Injectable, NotFoundException, Optional,
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

@Injectable()
export class TasksService {
  constructor(
    private readonly repo:         TasksRepository,
    private readonly usersService: UsersService,
    @Optional() private readonly gateway?:  TasksGateway,
    @Optional() private readonly comments?: CommentsService,
  ) {}

  async findAll(query: QueryTasksDto): Promise<Paginated<Task>> {
    const page    = query.page    ?? 1
    const perPage = query.perPage ?? 10

    const [items, total] = await this.repo.findFiltered(
      { state: query.state, priority: query.priority, assigneeId: query.assigneeId, search: query.search },
      page, perPage,
    )
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    return { items, total, page, perPage, totalPages }
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.repo.findById(id)
    if (!task) throw new NotFoundException(`Task ${id} not found`)
    return task
  }

  async create(dto: CreateTaskDto, creatorId: string): Promise<Task> {
    await this.assertAssigneeExists(dto.assigneeId)
    this.assertDueDateNotInPast(dto.dueDate)

    const task = await this.repo.insert({
      title:       dto.title.trim(),
      description: (dto.description ?? '').trim(),
      assigneeId:  dto.assigneeId,
      createdById: creatorId,
      priority:    dto.priority,
      state:       TaskState.TODO,
      dueDate:     dto.dueDate ?? null,
    })
    this.gateway?.emitTaskCreated(task)
    return task
  }

  async update(id: string, dto: UpdateTaskDto): Promise<Task> {
    await this.findOne(id)
    if (dto.assigneeId) await this.assertAssigneeExists(dto.assigneeId)
    if (dto.dueDate !== undefined) this.assertDueDateNotInPast(dto.dueDate)

    const patch: Partial<Task> = {}
    if (dto.title !== undefined)       patch.title       = dto.title.trim()
    if (dto.description !== undefined) patch.description = dto.description.trim()
    if (dto.assigneeId !== undefined)  patch.assigneeId  = dto.assigneeId
    if (dto.priority !== undefined)    patch.priority    = dto.priority
    if (dto.dueDate !== undefined)     patch.dueDate     = dto.dueDate ?? null

    const updated = await this.repo.update(id, patch)
    if (!updated) throw new NotFoundException(`Task ${id} not found`)
    this.gateway?.emitTaskUpdated(updated)
    return updated
  }

  async remove(id: string): Promise<void> {
    const ok = await this.repo.remove(id)
    if (!ok) throw new NotFoundException(`Task ${id} not found`)
    // FK ON DELETE CASCADE in the schema also covers this, but we keep
    // the explicit hook so the gateway emit stays accurate.
    await this.comments?.cascadeOnTaskDeletion(id)
    this.gateway?.emitTaskDeleted(id)
  }

  async setState(id: string, newState: TaskState): Promise<Task> {
    const task = await this.findOne(id)
    const allowed = VALID_TRANSITIONS[task.state]
    if (!allowed.includes(newState)) {
      throw new BadRequestException(
        `Invalid state transition: ${task.state} → ${newState}. ` +
        `Allowed from ${task.state}: [${allowed.join(', ') || 'none'}]`,
      )
    }
    const updated = await this.repo.setStateIfCurrent(id, task.state, newState)
    if (updated === null) {
      throw new ConflictException(
        `Task ${id} state changed concurrently — please reload and try again`,
      )
    }
    this.gateway?.emitTaskUpdated(updated)
    return updated
  }

  // ── Private guards ──────────────────────────────────────────
  private async assertAssigneeExists(assigneeId: string): Promise<void> {
    const ok = await this.usersService.exists(assigneeId)
    if (!ok) throw new BadRequestException(`Assignee ${assigneeId} does not exist`)
  }

  private assertDueDateNotInPast(dueDate?: string | null): void {
    if (!dueDate) return
    const now = new Date()
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-')
    if (dueDate < todayStr) {
      throw new BadRequestException('Due date must be today or in the future')
    }
  }

}