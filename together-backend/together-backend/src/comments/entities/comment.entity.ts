// Destination: together-backend/together-backend/src/comments/entities/comment.entity.ts
// REPLACE THE ENTIRE FILE. There must be NO `interface Comment` declaration.
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { Task } from '../../tasks/entities/task.entity'
import { User } from '../../users/entities/user.entity'

@Entity('comments')
@Index(['taskId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')           id!: string
  @Column({ type: 'uuid' })                 taskId!: string
  @ManyToOne(() => Task, t => t.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })           task?: Task

  @Column({ type: 'uuid' })                 authorId!: string
  @ManyToOne(() => User, u => u.comments, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'authorId' })         author?: User

  @Column({ type: 'varchar', length: 1000 }) body!: string

  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}