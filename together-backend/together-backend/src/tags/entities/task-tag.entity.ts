// Destination: together-backend/together-backend/src/tags/entities/task-tag.entity.ts
//
// Explicit join entity. We could have used @JoinTable on Task or Tag,
// but we want columns *on the join row itself* (when was the tag
// added, by whom) — and those richer stats are part of what makes the
// affinity query interesting. Composite PK (taskId, tagId) guarantees
// "one tag per task at most once".
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn,
} from 'typeorm'
import { Task } from '../../tasks/entities/task.entity'
import { Tag } from './tag.entity'
import { User } from '../../users/entities/user.entity'

@Entity('task_tags')
@Index(['tagId'])
@Index(['taskId'])
export class TaskTag {
  @PrimaryColumn({ type: 'uuid' })  taskId!: string
  @PrimaryColumn({ type: 'uuid' })  tagId!:  string

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })   task?: Task

  @ManyToOne(() => Tag, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })    tag?:  Tag

  // Who attached this tag. nullable so faker-seeded rows can skip it.
  @Column({ type: 'uuid', nullable: true })  addedByUserId!: string | null
  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'addedByUserId' })     addedBy?: User | null

  @CreateDateColumn({ type: 'timestamptz' }) addedAt!: Date
}