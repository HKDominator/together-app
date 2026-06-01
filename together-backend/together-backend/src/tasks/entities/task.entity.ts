// Destination: together-backend/together-backend/src/tasks/entities/task.entity.ts
// REPLACE THE ENTIRE FILE. There must be NO `interface Task` declaration.
//
// CHANGE FROM PRIOR VERSION:
//   - Added OneToMany inverse to TaskTag so we can `relations: { taskTags: { tag: true } }`
//     when we need eager tag bundles. The join table is created by
//     the TaskTag entity, not @JoinTable here.
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Comment } from '../../comments/entities/comment.entity'
import { TaskTag } from '../../tags/entities/task-tag.entity'

export enum Priority  { HIGH = 'high',   MEDIUM = 'medium', LOW = 'low' }
export enum TaskState { TODO = 'todo',   IN_PROGRESS = 'in_progress', DONE = 'done', CANCELLED = 'cancelled' }

export const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.TODO]:        [TaskState.IN_PROGRESS, TaskState.CANCELLED],
  [TaskState.IN_PROGRESS]: [TaskState.DONE,        TaskState.CANCELLED],
  [TaskState.DONE]:        [],
  [TaskState.CANCELLED]:   [],
}

@Entity('tasks')
@Index(['state'])
@Index(['priority'])
@Index(['assigneeId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')              id!: string
  @Column({ type: 'varchar', length: 100 })    title!: string
  @Column({ type: 'varchar', length: 500, default: '' }) description!: string

  @Column({ type: 'uuid' })                    assigneeId!: string
  @ManyToOne(() => User, u => u.assignedTasks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'assigneeId' })          assignee?: User

  @Column({ type: 'uuid' })                    createdById!: string
  @ManyToOne(() => User, u => u.createdTasks, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'createdById' })         createdBy?: User

  @Column({ type: 'enum', enum: Priority })    priority!: Priority
  @Column({ type: 'enum', enum: TaskState, default: TaskState.TODO }) state!: TaskState

  @Column({ type: 'varchar', length: 10, nullable: true }) dueDate!: string | null

  @CreateDateColumn({ type: 'timestamptz' })   createdAt!: Date
  @UpdateDateColumn({ type: 'timestamptz' })   updatedAt!: Date

  @OneToMany(() => Comment, c => c.task, { cascade: ['remove'] }) comments?: Comment[]

  // NEW: M:M to Tag via the explicit join entity.
  @OneToMany(() => TaskTag, tt => tt.task, { cascade: ['remove'] }) taskTags?: TaskTag[]
}