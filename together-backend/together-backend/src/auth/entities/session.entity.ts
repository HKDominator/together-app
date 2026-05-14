// Destination: together-backend/src/auth/entities/session.entity.ts
// One row per active login. JWT carries the session id (sid); the guard
// updates lastSeenAt on every request. If lastSeenAt drifts older than
// IDLE_TIMEOUT_MIN, the guard kills it.
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('sessions')
@Index(['userId'])
@Index(['revoked', 'lastSeenAt'])
export class Session {
  @PrimaryGeneratedColumn('uuid')                       id!: string
  @Column({ type: 'uuid' })                             userId!: string

  // For audit / "manage your sessions" UI
  @Column({ type: 'varchar', length: 255, default: '' }) userAgent!: string
  @Column({ type: 'varchar', length: 64,  default: '' }) ip!: string

  // Sliding window — bumped on every authenticated request
  @Column({ type: 'timestamptz', default: () => 'now()' }) lastSeenAt!: Date

  // Absolute hard expiry — even an active session dies after this
  @Column({ type: 'timestamptz' })                       expiresAt!: Date

  // Revoked via logout / "kill this session" / "kill all my sessions"
  @Column({ type: 'boolean', default: false })           revoked!: boolean

  @CreateDateColumn({ type: 'timestamptz' })             createdAt!: Date
}