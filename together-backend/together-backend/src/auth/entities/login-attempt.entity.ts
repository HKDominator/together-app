// Destination: together-backend/src/auth/entities/login-attempt.entity.ts
// Tracks a multi-factor login in progress: password is verified, but
// OTP / PIN steps still pending. Holds the OTP hash + expiry. One row
// per /auth/login call; consumed once the user finishes auth.
import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm'

export type LoginStage = 'otp' | 'pin' | 'done'

@Entity('login_attempts')
@Index(['userId', 'createdAt'])
export class LoginAttempt {
  @PrimaryGeneratedColumn('uuid')                         id!: string
  @Column({ type: 'uuid' })                               userId!: string

  // Hashed 6-digit code we mailed to the user. Stored hashed so a
  // leaked DB snapshot doesn't compromise pending logins.
  @Column({ type: 'varchar', length: 255, default: '' })  otpHash!: string

  // Tracks where in the flow we are: 'otp' = still waiting for OTP,
  // 'pin' = OTP verified, waiting for PIN, 'done' = finished (cookie issued).
  @Column({ type: 'varchar', length: 10, default: 'otp' }) stage!: LoginStage

  @Column({ type: 'int', default: 0 })                    attempts!: number   // OTP entry tries

  @Column({ type: 'timestamptz' })                        expiresAt!: Date

  @Column({ type: 'varchar', length: 64, default: '' })   ip!: string
  @Column({ type: 'varchar', length: 255, default: '' })  userAgent!: string

  @CreateDateColumn({ type: 'timestamptz' })              createdAt!: Date
}