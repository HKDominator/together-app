// Destination: together-backend/together-backend/src/tags/tags.service.ts
import {
  ConflictException, Injectable, NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Tag } from './entities/tag.entity'
import { TaskTag } from './entities/task-tag.entity'

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)     private readonly tags:     Repository<Tag>,
    @InjectRepository(TaskTag) private readonly taskTags: Repository<TaskTag>,
  ) {}

  // ── Tag CRUD ─────────────────────────────────────────────────
  list(): Promise<Tag[]> {
    return this.tags.find({ order: { name: 'ASC' } })
  }

  async create(input: { name: string; color?: string; kind?: string }): Promise<Tag> {
    const dupe = await this.tags.findOne({ where: { name: input.name } })
    if (dupe) throw new ConflictException(`Tag "${input.name}" already exists`)
    return this.tags.save(this.tags.create({
      name:  input.name,
      color: input.color ?? '#888888',
      kind:  input.kind  ?? 'category',
    }))
  }

  async remove(id: string): Promise<void> {
    const r = await this.tags.delete(id)
    if (!r.affected) throw new NotFoundException(`Tag ${id} not found`)
  }

  // ── Attach / detach ──────────────────────────────────────────
  async attach(taskId: string, tagId: string, addedByUserId: string | null): Promise<TaskTag> {
    // Upsert: if it already exists, return the existing row.
    const existing = await this.taskTags.findOne({ where: { taskId, tagId } })
    if (existing) return existing
    return this.taskTags.save(this.taskTags.create({ taskId, tagId, addedByUserId }))
  }

  async detach(taskId: string, tagId: string): Promise<boolean> {
    const r = await this.taskTags.delete({ taskId, tagId })
    return (r.affected ?? 0) > 0
  }

  async tagsForTask(taskId: string): Promise<Tag[]> {
    const rows = await this.taskTags.find({
      where: { taskId }, relations: { tag: true },
    })
    return rows.map(r => r.tag).filter((t): t is Tag => Boolean(t))
  }
}