// Destination: together-backend/together-backend/src/logs/logs.service.ts
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ActionLog } from './entities/action-log.entity'

export interface LogQuery {
  userId?: string
  page?:   number
  perPage?:number
}

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(ActionLog) private readonly repo: Repository<ActionLog>,
  ) {}

  insert(draft: Partial<ActionLog>) {
    return this.repo.save(this.repo.create(draft))
  }

  async list(q: LogQuery) {
    const page = q.page ?? 1
    const perPage = Math.min(q.perPage ?? 50, 200)
    const where = q.userId ? { userId: q.userId } : {}
    const [items, total] = await this.repo.findAndCount({
      where, order: { createdAt: 'DESC' },
      skip: (page - 1) * perPage, take: perPage,
    })
    return { items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)) }
  }

  /** Count rows since a given timestamp for a user. Used by the detector. */
  countSince(userId: string, sinceMs: number, action?: string): Promise<number> {
    const qb = this.repo.createQueryBuilder('l')
      .where('l.userId = :userId', { userId })
      .andWhere('l.createdAt > :since', { since: new Date(Date.now() - sinceMs) })
    if (action) qb.andWhere('l.action LIKE :action', { action: `%${action}%` })
    return qb.getCount()
  }
}