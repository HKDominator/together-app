// Destination: together-backend/together-backend/src/comments/comments.repository.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Comment } from './entities/comment.entity'

@Injectable()
export class CommentsRepository {
  constructor(
    @InjectRepository(Comment) private readonly repo: Repository<Comment>,
  ) {}

  findByTask(taskId: string): Promise<Comment[]> {
    return this.repo.find({ where: { taskId }, order: { createdAt: 'ASC' } })
  }

  findById(id: string): Promise<Comment | null> {
    return this.repo.findOne({ where: { id } })
  }

  countByTask(taskId: string): Promise<number> {
    return this.repo.count({ where: { taskId } })
  }

  async topTasksByCommentCount(n: number): Promise<{ taskId: string; count: number }[]> {
    const rows = await this.repo.createQueryBuilder('c')
      .select('c.taskId', 'taskId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.taskId')
      .orderBy('count', 'DESC')
      .limit(n)
      .getRawMany()
    return rows.map(r => ({ taskId: r.taskId, count: Number(r.count) }))
  }

  insert(draft: Partial<Comment>): Promise<Comment> {
    return this.repo.save(this.repo.create(draft))
  }

  async update(id: string, body: string): Promise<Comment | null> {
    await this.repo.update(id, { body })
    return this.findById(id)
  }

  async remove(id: string): Promise<boolean> {
    const r = await this.repo.delete(id)
    return (r.affected ?? 0) > 0
  }

  /** Cascade hook for task deletion — DB also enforces this via FK. */
  async removeAllForTask(taskId: string): Promise<number> {
    const r = await this.repo.delete({ taskId })
    return r.affected ?? 0
  }

  async clear(): Promise<void> {
    await this.repo.query('TRUNCATE TABLE comments RESTART IDENTITY CASCADE')
  }
}