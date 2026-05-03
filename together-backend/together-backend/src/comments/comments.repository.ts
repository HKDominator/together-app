import { Injectable } from '@nestjs/common'
import { v4 as uuid } from 'uuid'
import { Comment } from './entities/comment.entity'

/**
 * Two-level lookup — by comment id (for update/delete) and by taskId
 * (for the 1-to-many read). The second index stays O(1) for small
 * comment counts; swap for a proper DB when the domain grows.
 *
 * Bronze forbids persistence — Silver/Gold didn't lift that, so this
 * is still in-RAM.
 */
@Injectable()
export class CommentsRepository {
  private readonly byId:     Map<string, Comment>   = new Map()
  private readonly byTaskId: Map<string, string[]>  = new Map()

  constructor() {
    SEED_COMMENTS.forEach(c => this.attach(c))
  }

  // ── Reads ────────────────────────────────────────────────────
  findByTask(taskId: string): Comment[] {
    const ids = this.byTaskId.get(taskId) ?? []
    return ids.map(id => this.byId.get(id)!).filter(Boolean)
  }

  findById(id: string): Comment | undefined {
    return this.byId.get(id)
  }

  countByTask(taskId: string): number {
    return this.byTaskId.get(taskId)?.length ?? 0
  }

  /** Top-N tasks by comment count — used by StatsService. */
  topTasksByCommentCount(n: number): { taskId: string; count: number }[] {
    return Array.from(this.byTaskId.entries())
      .map(([taskId, ids]) => ({ taskId, count: ids.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n)
  }

  // ── Writes ───────────────────────────────────────────────────
  insert(draft: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>): Comment {
    const now = new Date().toISOString()
    const c: Comment = { ...draft, id: uuid(), createdAt: now, updatedAt: now }
    this.attach(c)
    return c
  }

  update(id: string, body: string): Comment | undefined {
    const current = this.byId.get(id)
    if (!current) return undefined
    const next: Comment = { ...current, body, updatedAt: new Date().toISOString() }
    this.byId.set(id, next)
    return next
  }

  remove(id: string): boolean {
    const c = this.byId.get(id)
    if (!c) return false
    this.byId.delete(id)
    const bucket = this.byTaskId.get(c.taskId)
    if (bucket) {
      const pruned = bucket.filter(x => x !== id)
      if (pruned.length === 0) this.byTaskId.delete(c.taskId)
      else                     this.byTaskId.set(c.taskId, pruned)
    }
    return true
  }

  /** When a task is deleted we cascade its comments. */
  removeAllForTask(taskId: string): number {
    const ids = this.byTaskId.get(taskId) ?? []
    for (const id of ids) this.byId.delete(id)
    this.byTaskId.delete(taskId)
    return ids.length
  }

  clear(): void {
    this.byId.clear()
    this.byTaskId.clear()
  }

  // ── Internals ────────────────────────────────────────────────
  private attach(c: Comment): void {
    this.byId.set(c.id, c)
    const bucket = this.byTaskId.get(c.taskId) ?? []
    bucket.push(c.id)
    this.byTaskId.set(c.taskId, bucket)
  }
}

// ──────────────────────────────────────────────────────────────────
// Seeds — give the couple-vibe tasks some back-and-forth so the UI
// has something to show on first load.
// ──────────────────────────────────────────────────────────────────
const iso = (s: string) => new Date(s).toISOString()

const SEED_COMMENTS: Comment[] = [
  { id: 'c1', taskId: 't1', authorId: 'u2', body: 'Did you confirm the window table? ❤️',              createdAt: iso('2026-03-09T10:00:00'), updatedAt: iso('2026-03-09T10:00:00') },
  { id: 'c2', taskId: 't1', authorId: 'u1', body: 'Yes — also asked about the vegetarian menu.',        createdAt: iso('2026-03-09T12:30:00'), updatedAt: iso('2026-03-09T12:30:00') },
  { id: 'c3', taskId: 't1', authorId: 'u2', body: 'Perfect. Thank you 🥂',                              createdAt: iso('2026-03-09T12:45:00'), updatedAt: iso('2026-03-09T12:45:00') },
  { id: 'c4', taskId: 't2', authorId: 'u1', body: 'Allianz came in €40 cheaper than Generali this year.', createdAt: iso('2026-03-11T09:15:00'), updatedAt: iso('2026-03-11T09:15:00') },
  { id: 'c5', taskId: 't3', authorId: 'u2', body: 'Let\'s do Alfama on day 1 and Belém on day 2?',      createdAt: iso('2026-03-02T18:00:00'), updatedAt: iso('2026-03-02T18:00:00') },
  { id: 'c6', taskId: 't5', authorId: 'u1', body: 'Signed and emailed. Keep a scan for our records.',   createdAt: iso('2026-03-28T17:20:00'), updatedAt: iso('2026-03-28T17:20:00') },
]
