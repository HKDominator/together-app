// Destination: together-backend/together-backend/src/logs/entities/observation.entity.ts
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'

@Entity('observation_list')
@Index(['userId'], { unique: true })   // one row per user
export class Observation {
  @PrimaryGeneratedColumn('uuid')                      id!: string
  @Column({ type: 'uuid' })                            userId!: string
  @Column({ type: 'varchar', length: 100 })            userEmail!: string
  @Column({ type: 'varchar', length: 100 })            userName!: string
  @Column({ type: 'varchar', length: 500 })            reason!: string
  @Column({ type: 'int', default: 1 })                 score!: number       // higher = more suspicious
  @Column({ type: 'boolean', default: false })         resolved!: boolean
  @Column({ type: 'jsonb', nullable: true })           evidence!: Record<string, unknown> | null
  @CreateDateColumn({ type: 'timestamptz' })           flaggedAt!: Date
  @UpdateDateColumn({ type: 'timestamptz' })           updatedAt!: Date
}