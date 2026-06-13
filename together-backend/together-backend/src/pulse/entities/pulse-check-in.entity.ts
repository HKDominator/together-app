// Destination: together-backend/together-backend/src/pulse/entities/pulse-check-in.entity.ts
// Wave 5 (FD-16 / ADR-0004): one partner's mood/energy Check-in.
//
// The unique (userId, pulseDay) index IS the product rule "one Check-in
// per partner per Pulse Day" — enforced by the schema, not by code.
// Rows are retained after rollover but never surfaced (no history,
// trends, or streaks per ADR-0004); they are never deleted and never
// feed statistics.
import {
  Column, CreateDateColumn, Entity, Index, JoinColumn,
  ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Mood, Energy } from '../reading'

@Entity('pulse_check_ins')
@Index(['userId', 'pulseDay'], { unique: true })
export class PulseCheckIn {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Column({ type: 'uuid' }) userId!: string
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' }) user?: User

  // Local calendar day in the deployment timezone, 'YYYY-MM-DD'.
  // Always computed server-side (pulse-day.util.ts), never client-sent.
  @Column({ type: 'date' }) pulseDay!: string

  @Column({ type: 'varchar', length: 20 }) mood!: Mood
  @Column({ type: 'varchar', length: 20 }) energy!: Energy

  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date
  @UpdateDateColumn({ type: 'timestamptz' }) updatedAt!: Date
}
