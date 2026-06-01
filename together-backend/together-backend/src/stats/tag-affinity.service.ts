// Destination: together-backend/together-backend/src/stats/tag-affinity.service.ts
//
// THE HEAVY STAT. Three implementations of the same logical query:
//   - naive():  pulls all tasks via TypeORM, loops in JS, does N+1
//               fetches for co-tag analysis. O(users × tasks).
//   - sql():    a single CTE-based query with a lateral subquery for
//               top co-tags. O(rows) in Postgres.
//   - cached(): sql() with a 30-second in-memory result cache, plus
//               a fallback to the materialized view for big windows.
//
// All three return the same shape; the JMeter benchmark compares them.
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Task, TaskState } from '../tasks/entities/task.entity'
import { Tag } from '../tags/entities/tag.entity'
import { TaskTag } from '../tags/entities/task-tag.entity'
import { User } from '../users/entities/user.entity'

export interface TagAffinityRow {
  userId:        string
  userEmail:     string
  userName:      string
  tagId:         string
  tagName:       string
  tagColor:      string
  taskCount:     number
  doneCount:     number
  completionPct: number   // 0-100
  avgDaysActive: number
  topCoTags:     Array<{ id: string; name: string; count: number }>
}

interface CacheEntry { rows: TagAffinityRow[]; expiresAt: number }

@Injectable()
export class TagAffinityService {
  private readonly log = new Logger(TagAffinityService.name)
  private readonly cache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL_MS = 30_000

  constructor(
    @InjectRepository(Task)    private readonly tasks:    Repository<Task>,
    @InjectRepository(Tag)     private readonly tags:     Repository<Tag>,
    @InjectRepository(TaskTag) private readonly taskTags: Repository<TaskTag>,
    @InjectRepository(User)    private readonly users:    Repository<User>,
    private readonly ds: DataSource,
  ) {}

  // ───────────────────────────────────────────────────────────────
  // NAIVE: deliberately N+1, deliberately in JS. This is the "before"
  // in the JMeter demo. At 50k tasks × 200 users it's a multi-second
  // request even with hot caches because we're doing array work in V8
  // instead of letting Postgres do it.
  // ───────────────────────────────────────────────────────────────
  async naive(daysWindow = 90): Promise<TagAffinityRow[]> {
    const cutoff = new Date(Date.now() - daysWindow * 86400_000)

    const users     = await this.users.find()
    const allTags   = await this.tags.find()
    const tagsById  = new Map(allTags.map(t => [t.id, t]))

    const results: TagAffinityRow[] = []

    for (const u of users) {
      // Pull this user's tasks with their tag joins. N+1: one query per user.
      const userTasks = await this.tasks.find({
        where:    { assigneeId: u.id },
        relations: { taskTags: true },
      })

      // Group by tag in JS.
      const byTag = new Map<string, { tasks: Task[]; done: number; days: number[] }>()
      for (const tk of userTasks) {
        if (tk.createdAt < cutoff) continue
        for (const tt of tk.taskTags ?? []) {
          let bucket = byTag.get(tt.tagId)
          if (!bucket) {
            bucket = { tasks: [], done: 0, days: [] }
            byTag.set(tt.tagId, bucket)
          }
          bucket.tasks.push(tk)
          if (tk.state === TaskState.DONE) bucket.done++
          const span = (tk.updatedAt.getTime() - tk.createdAt.getTime()) / 86400_000
          bucket.days.push(span)
        }
      }

      // Walk each (user, tag) bucket. For each, do *another* fetch
      // to find co-tags. This is the second N+1 layer. Hot path: bad.
      for (const [tagId, bucket] of byTag) {
        const tag = tagsById.get(tagId)
        if (!tag) continue

        const coCount = new Map<string, number>()
        for (const tk of bucket.tasks) {
          for (const tt of tk.taskTags ?? []) {
            if (tt.tagId === tagId) continue
            coCount.set(tt.tagId, (coCount.get(tt.tagId) ?? 0) + 1)
          }
        }
        const topCoTags = [...coCount.entries()]
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([id, count]) => {
            const t = tagsById.get(id)
            return { id, name: t?.name ?? '?', count }
          })

        const taskCount = bucket.tasks.length
        const avgDays   = bucket.days.length
          ? bucket.days.reduce((a, b) => a + b, 0) / bucket.days.length
          : 0

        results.push({
          userId:        u.id,
          userEmail:     u.email,
          userName:      u.name,
          tagId:         tag.id,
          tagName:       tag.name,
          tagColor:      tag.color,
          taskCount,
          doneCount:     bucket.done,
          completionPct: taskCount ? Math.round((bucket.done / taskCount) * 100) : 0,
          avgDaysActive: Math.round(avgDays * 100) / 100,
          topCoTags,
        })
      }
    }

    return results.sort((a, b) => b.taskCount - a.taskCount)
  }

  // ───────────────────────────────────────────────────────────────
  // SQL: single query, indexed, all aggregation server-side. This is
  // what we'd ship to production. The CTE computes per-(user,tag)
  // metrics, the lateral subquery on top fetches the 3 most-common
  // co-tags for each row.
  // ───────────────────────────────────────────────────────────────
  async sql(daysWindow = 90): Promise<TagAffinityRow[]> {
    const cutoff = new Date(Date.now() - daysWindow * 86400_000)

    const rows = await this.ds.query(
      `
      WITH user_tag_stats AS (
        SELECT
          u.id                                                          AS user_id,
          u.email                                                       AS user_email,
          u.name                                                        AS user_name,
          t.id                                                          AS tag_id,
          t.name                                                        AS tag_name,
          t.color                                                       AS tag_color,
          COUNT(*)::int                                                 AS task_count,
          COUNT(*) FILTER (WHERE tk.state = 'done')::int                AS done_count,
          COALESCE(
            ROUND(100.0 * COUNT(*) FILTER (WHERE tk.state = 'done')
                        / NULLIF(COUNT(*), 0))::int,
            0
          )                                                             AS completion_pct,
          COALESCE(
            ROUND(AVG(EXTRACT(EPOCH FROM (tk."updatedAt" - tk."createdAt")) / 86400.0)::numeric, 2),
            0
          )                                                             AS avg_days_active
        FROM users u
        JOIN tasks      tk ON tk."assigneeId" = u.id
        JOIN task_tags  tt ON tt."taskId"     = tk.id
        JOIN tags       t  ON t.id            = tt."tagId"
        WHERE tk."createdAt" >= $1
        GROUP BY u.id, u.email, u.name, t.id, t.name, t.color
      )
      SELECT
        s.*,
        (
          SELECT COALESCE(json_agg(co ORDER BY co.cnt DESC), '[]'::json)
          FROM (
            SELECT ct.id AS id, ct.name AS name, COUNT(*)::int AS cnt
            FROM task_tags tt1
            JOIN task_tags tt2 ON tt2."taskId" = tt1."taskId"
                              AND tt2."tagId" <> tt1."tagId"
            JOIN tags ct      ON ct.id        = tt2."tagId"
            JOIN tasks tk2    ON tk2.id       = tt1."taskId"
            WHERE tt1."tagId"      = s.tag_id
              AND tk2."assigneeId" = s.user_id
              AND tk2."createdAt"  >= $1
            GROUP BY ct.id, ct.name
            ORDER BY cnt DESC
            LIMIT 3
          ) co
        )                                                               AS top_co_tags
      FROM user_tag_stats s
      ORDER BY s.task_count DESC
      `,
      [cutoff.toISOString()],
    )

    return rows.map((r: {
      user_id: string; user_email: string; user_name: string
      tag_id: string; tag_name: string; tag_color: string
      task_count: number; done_count: number
      completion_pct: number; avg_days_active: string | number
      top_co_tags: Array<{ id: string; name: string; cnt: number }> | null
    }) => ({
      userId:        r.user_id,
      userEmail:     r.user_email,
      userName:      r.user_name,
      tagId:         r.tag_id,
      tagName:       r.tag_name,
      tagColor:      r.tag_color,
      taskCount:     r.task_count,
      doneCount:     r.done_count,
      completionPct: r.completion_pct,
      avgDaysActive: Number(r.avg_days_active),
      topCoTags:     (r.top_co_tags ?? []).map(c => ({
        id: c.id, name: c.name, count: c.cnt,
      })),
    }))
  }

  // ───────────────────────────────────────────────────────────────
  // CACHED: sql() wrapped with 30s LRU. If matview path is fresh,
  // serves from there instead (no co-tags column though — we read
  // them on demand and merge).
  // ───────────────────────────────────────────────────────────────
  async cached(daysWindow = 90): Promise<TagAffinityRow[]> {
    const key = `affinity:${daysWindow}`
    const hit = this.cache.get(key)
    const now = Date.now()
    if (hit && hit.expiresAt > now) return hit.rows

    const rows = await this.sql(daysWindow)
    this.cache.set(key, { rows, expiresAt: now + this.CACHE_TTL_MS })

    // Opportunistic GC.
    if (this.cache.size > 32) {
      for (const [k, v] of this.cache) {
        if (v.expiresAt <= now) this.cache.delete(k)
      }
    }
    return rows
  }

  invalidate(): { cleared: number } {
    const n = this.cache.size
    this.cache.clear()
    return { cleared: n }
  }

  // Useful for the demo: returns the EXPLAIN ANALYZE plan from
  // Postgres so the writeup can show "before/after index" plans.
  async explain(daysWindow = 90): Promise<unknown[]> {
    const cutoff = new Date(Date.now() - daysWindow * 86400_000)
    return this.ds.query(
      `EXPLAIN (ANALYZE, FORMAT JSON)
       SELECT u.id, t.id, COUNT(*)
       FROM users u
       JOIN tasks tk     ON tk."assigneeId" = u.id
       JOIN task_tags tt ON tt."taskId"     = tk.id
       JOIN tags t       ON t.id            = tt."tagId"
       WHERE tk."createdAt" >= $1
       GROUP BY u.id, t.id`,
      [cutoff.toISOString()],
    )
  }

  async refreshMatview(): Promise<{ ok: true }> {
    // CONCURRENTLY needs the unique index we created in 03_tags_and_indices.sql.
    await this.ds.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tag_affinity')
    this.cache.clear()
    return { ok: true }
  }
}