// Destination: together-backend/together-backend/src/logs/entities/action-log.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('action_logs')
@Index(['userId', 'createdAt'])
@Index(['action'])
export class ActionLog {
  @PrimaryGeneratedColumn('uuid')                        id!: string
  @Column({ type: 'uuid', nullable: true })              userId!: string | null   // null = anonymous
  @Column({ type: 'varchar', length: 50, default: '' })  userRole!: string        // 'admin' | 'user' | ''
  @Column({ type: 'varchar', length: 100 })              action!: string          // e.g. 'POST /api/tasks'
  @Column({ type: 'varchar', length: 50 })               method!: string          // GET/POST/...
  @Column({ type: 'varchar', length: 255 })              path!: string
  @Column({ type: 'int' })                               statusCode!: number
  @Column({ type: 'int' })                               durationMs!: number
  @Column({ type: 'varchar', length: 64, default: '' })  ip!: string
  @Column({ type: 'jsonb', nullable: true })             metadata!: Record<string, unknown> | null
  @CreateDateColumn({ type: 'timestamptz' })             createdAt!: Date
}