// Destination: together-backend/together-backend/src/stats/stats.service.ts
// REPLACE the entire file. The previous version had a broken `recentCount`
// expression — gone. Now using TasksRepository.countSince().
import { Injectable, Optional } from '@nestjs/common'
import { TasksRepository } from '../tasks/tasks.repository'
import { Priority, TaskState } from '../tasks/entities/task.entity'
import { UsersService } from '../users/users.service'
import { CommentsRepository } from '../comments/comments.repository'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export interface UserStats        { userId: string; total: number; done: number }
export interface TopCommentedTask { taskId: string; title: string; count: number }
export interface TasksStats {
  total:             number
  byState:           Record<TaskState, number>
  byPriority:        Record<Priority, number>
  byUser:            UserStats[]
  overdue:           number
  completionRate:    number
  recentCount:       number
  topCommentedTasks: TopCommentedTask[]
}

@Injectable()
export class StatsService {
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly users:     UsersService,
    @Optional() private readonly commentsRepo?: CommentsRepository,
  ) {}

  async getUserStats(userId: string) {
    return this.tasksRepo.getUserTaskStats(userId)
  } 

  async compute(): Promise<TasksStats> {
    const since = new Date(Date.now() - THIRTY_DAYS_MS)

    const [stateRows, priorityRows, userRows, overdue, total, allUsers, recentCount] =
      await Promise.all([
        this.tasksRepo.countByState(),
        this.tasksRepo.countByPriority(),
        this.tasksRepo.countByAssignee(),
        this.tasksRepo.countOverdue(),
        this.tasksRepo.count(),
        this.users.findAll(),
        this.tasksRepo.countSince(since),
      ])

    const byState: Record<TaskState, number> = {
      [TaskState.TODO]: 0, [TaskState.IN_PROGRESS]: 0,
      [TaskState.DONE]: 0, [TaskState.CANCELLED]: 0,
    }
    for (const r of stateRows) byState[r.state] = Number(r.count)

    const byPriority: Record<Priority, number> = {
      [Priority.HIGH]: 0, [Priority.MEDIUM]: 0, [Priority.LOW]: 0,
    }
    for (const r of priorityRows) byPriority[r.priority] = Number(r.count)

    const byUser: UserStats[] = allUsers.map(u => {
      const row = userRows.find(r => r.userId === u.id)
      return {
        userId: u.id,
        total:  row ? Number(row.total) : 0,
        done:   row ? Number(row.done)  : 0,
      }
    })

    const done      = byState[TaskState.DONE]      ?? 0
    const cancelled = byState[TaskState.CANCELLED] ?? 0
    const actionable = total - cancelled
    const completionRate = actionable > 0 ? Math.round((done / actionable) * 100) : 0

    const topCommentedTasks: TopCommentedTask[] = []
    if (this.commentsRepo) {
      const top   = await this.commentsRepo.topTasksByCommentCount(5)
      const tasks = await this.tasksRepo.findByIds(top.map(t => t.taskId))
      const byId  = new Map(tasks.map(t => [t.id, t]))
      for (const t of top) {
        const task = byId.get(t.taskId)
        if (task) topCommentedTasks.push({ taskId: task.id, title: task.title, count: t.count })
      }
    }

    return {
      total, byState, byPriority, byUser, overdue,
      completionRate, recentCount, topCommentedTasks,
    }
  }
}