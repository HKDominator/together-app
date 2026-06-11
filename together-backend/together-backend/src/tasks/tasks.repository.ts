// Destination: together-backend/together-backend/src/tasks/tasks.repository.ts
// Replaces the in-memory Map. Same method signatures (now async) so
// TasksService barely changes.
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Repository } from 'typeorm'
import { Task, Priority, TaskState } from './entities/task.entity'

export interface TasksFilter {
  state?:      TaskState
  priority?:   Priority
  assigneeId?: string
  search?:     string
}

@Injectable()
export class TasksRepository {
  private readonly log = new Logger(TasksRepository.name)

  constructor(
    @InjectRepository(Task) private readonly repo: Repository<Task>,
  ) {}

  findAll(): Promise<Task[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  /**
   * Filtered + paginated query — pushed into SQL so we don't
   * `findAll()` and slice in JS. Returns [items, totalMatching].
   */
  async findFiltered(filter: TasksFilter, page: number, perPage: number): Promise<[Task[], number]> {
    const where: Record<string, unknown> = {}
    if (filter.state)      where.state      = filter.state
    if (filter.priority)   where.priority   = filter.priority
    if (filter.assigneeId) where.assigneeId = filter.assigneeId
    if (filter.search)     where.title      = ILike(`%${filter.search}%`)

    return this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip:  (page - 1) * perPage,
      take:  perPage,
    })
  }

  findById(id: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id } })
  }

  findByIds(ids: string[]): Promise<Task[]> {
    if (ids.length === 0) return Promise.resolve([])
    return this.repo.find({ where: ids.map(id => ({ id })) })
  }

  insert(draft: Partial<Task>): Promise<Task> {
    return this.repo.save(this.repo.create(draft))
  }

  async update(id: string, patch: Partial<Task>): Promise<Task | null> {
    await this.repo.update(id, patch)
    return this.findById(id)
  }

  /** Atomic conditional update: only sets state if the row still has
   *  expectedState. Returns the updated task, or null if the state had
   *  already changed (concurrent transition — caller should 409). */
  async setStateIfCurrent(
    id: string,
    expectedState: TaskState,
    newState: TaskState,
  ): Promise<Task | null> {
    const result = await this.repo
      .createQueryBuilder()
      .update(Task)
      .set({ state: newState })
      .where('id = :id AND state = :expected', { id, expected: expectedState })
      .execute()
    if ((result.affected ?? 0) === 0) return null
    return this.findById(id)
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.repo.delete(id)
    return (r.affected ?? 0) > 0
  }

  async clear(): Promise<void> {
    await this.repo.query('TRUNCATE TABLE tasks RESTART IDENTITY CASCADE')
  }

  count(): Promise<number> {
    return this.repo.count()
  }

  // ── Aggregates used by StatsService ─────────────────────────
  countByState(): Promise<{ state: TaskState; count: string }[]> {
    return this.repo.createQueryBuilder('t')
      .select('t.state', 'state')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.state')
      .getRawMany()
  }

  // Destination: together-backend/together-backend/src/tasks/tasks.repository.ts
// ADD this method to the existing TasksRepository class (next to countByState etc.):

countSince(since: Date): Promise<number> {
  return this.repo.createQueryBuilder('t')
    .where('t.createdAt > :since', { since: since.toISOString() })
    .getCount()
}

async getUserTaskStats(userId: string): Promise<{
  total: number; done: number; inProgress: number; todo: number; cancelled: number; overdue: number
}> {
  try {
    const rows = await this.repo.query(
      'SELECT * FROM get_user_task_stats($1)', [userId],
    )
    const r = rows[0] ?? {}
    return {
      total:      Number(r.total_tasks       ?? 0),
      done:       Number(r.done_tasks        ?? 0),
      inProgress: Number(r.in_progress_tasks ?? 0),
      todo:       Number(r.todo_tasks        ?? 0),
      cancelled:  Number(r.cancelled_tasks   ?? 0),
      overdue:    Number(r.overdue_tasks     ?? 0),
    }
  } catch (err: any) {
    if (err?.code !== '42883') throw err
    // BUG-12: stored proc absent (init-sql/ missing) — fall back to inline queries
    this.log.warn('get_user_task_stats SP missing — using fallback inline queries')
    const base = () => this.repo.createQueryBuilder('t').where('t.assigneeId = :uid', { uid: userId })
    const today = new Date().toISOString().slice(0, 10)
    const [total, done, inProgress, todo, cancelled, overdue] = await Promise.all([
      base().getCount(),
      base().andWhere('t.state = :s', { s: TaskState.DONE }).getCount(),
      base().andWhere('t.state = :s', { s: TaskState.IN_PROGRESS }).getCount(),
      base().andWhere('t.state = :s', { s: TaskState.TODO }).getCount(),
      base().andWhere('t.state = :s', { s: TaskState.CANCELLED }).getCount(),
      base().andWhere('t.dueDate IS NOT NULL')
            .andWhere('t.dueDate < :today', { today })
            .andWhere(`t.state NOT IN ('done','cancelled')`).getCount(),
    ])
    return { total, done, inProgress, todo, cancelled, overdue }
  }
}

  countByPriority(): Promise<{ priority: Priority; count: string }[]> {
    return this.repo.createQueryBuilder('t')
      .select('t.priority', 'priority')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.priority')
      .getRawMany()
  }

  countByAssignee(): Promise<{ userId: string; total: string; done: string }[]> {
    return this.repo.createQueryBuilder('t')
      .select('t.assigneeId', 'userId')
      .addSelect('COUNT(*)', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE t.state = 'done')`, 'done')
      .groupBy('t.assigneeId')
      .getRawMany()
  }

  async countOverdue(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10)
    return this.repo.createQueryBuilder('t')
      .where('t.dueDate IS NOT NULL')
      .andWhere('t.dueDate < :today', { today })
      .andWhere(`t.state NOT IN ('done', 'cancelled')`)
      .getCount()
  }
}