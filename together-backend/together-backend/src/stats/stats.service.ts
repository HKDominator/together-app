import { Injectable, Optional } from '@nestjs/common'
import { TasksRepository } from '../tasks/tasks.repository'
import { Priority, TaskState } from '../tasks/entities/task.entity'
import { UsersService } from '../users/users.service'
import { CommentsRepository } from '../comments/comments.repository'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export interface UserStats {
  userId: string
  total:  number
  done:   number
}

export interface TopCommentedTask {
  taskId: string
  title:  string
  count:  number
}

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

/**
 * Pure aggregation over the in-RAM stores. Single-pass where possible,
 * fresh snapshot every call. CommentsRepository is @Optional so this
 * module still works if Comments aren't wired (e.g. Bronze-only build).
 */
@Injectable()
export class StatsService {
  constructor(
    private readonly tasksRepo: TasksRepository,
    private readonly users:     UsersService,
    @Optional() private readonly commentsRepo?: CommentsRepository,
  ) {}

  compute(): TasksStats {
    const tasks = this.tasksRepo.findAll()
    const total = tasks.length

    const byState: Record<TaskState, number> = {
      [TaskState.TODO]:        0,
      [TaskState.IN_PROGRESS]: 0,
      [TaskState.DONE]:        0,
      [TaskState.CANCELLED]:   0,
    }
    const byPriority: Record<Priority, number> = {
      [Priority.HIGH]:   0,
      [Priority.MEDIUM]: 0,
      [Priority.LOW]:    0,
    }

    const now             = Date.now()
    const recentCutoff    = now - THIRTY_DAYS_MS
    const todayMidnight   = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    const todayMidnightMs = todayMidnight.getTime()

    let overdue     = 0
    let done        = 0
    let recentCount = 0

    const perUser = new Map<string, UserStats>()
    for (const u of this.users.findAll()) {
      perUser.set(u.id, { userId: u.id, total: 0, done: 0 })
    }

    for (const t of tasks) {
      byState[t.state]++
      byPriority[t.priority]++
      if (t.state === TaskState.DONE) done++

      if (t.dueDate) {
        const dueMs = new Date(t.dueDate).getTime()
        if (dueMs < todayMidnightMs
          && t.state !== TaskState.DONE
          && t.state !== TaskState.CANCELLED) {
          overdue++
        }
      }
      if (new Date(t.createdAt).getTime() > recentCutoff) recentCount++

      const u = perUser.get(t.assigneeId)
      if (u) {
        u.total++
        if (t.state === TaskState.DONE) u.done++
      }
    }

    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    // Top-5 most-discussed tasks — joins comment counts to task titles.
    const topCommentedTasks: TopCommentedTask[] = this.commentsRepo
      ? this.commentsRepo
          .topTasksByCommentCount(5)
          .map(({ taskId, count }) => {
            const t = this.tasksRepo.findById(taskId)
            return t ? { taskId, title: t.title, count } : null
          })
          .filter((x): x is TopCommentedTask => x !== null)
      : []

    return {
      total,
      byState,
      byPriority,
      byUser: Array.from(perUser.values()),
      overdue,
      completionRate,
      recentCount,
      topCommentedTasks,
    }
  }
}
