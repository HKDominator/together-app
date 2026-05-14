// Destination: together-backend/src/auth/entities/password-reset.entity.ts
// One row per "I forgot my password" request. Token is delivered to
// the user (via mailer.service) and exchanged for a new password.
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm'

@Entity('password_resets')
@Index(['userId'])
export class PasswordReset {
  @PrimaryGeneratedColumn('uuid')                        id!: string
  @Column({ type: 'uuid' })                              userId!: string
  @Column({ type: 'varchar', length: 255 })              tokenHash!: string
  @Column({ type: 'timestamptz' })                       expiresAt!: Date
  @Column({ type: 'boolean', default: false })           used!: boolean
  @CreateDateColumn({ type: 'timestamptz' })             createdAt!: Date
}