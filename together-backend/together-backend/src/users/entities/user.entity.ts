// Destination: together-backend/src/users/entities/user.entity.ts
// REPLACE — adds security PIN (3rd factor) and feature flags. Keeps
// the M:M Role relation introduced in Assignment 3.
import {
  Column, CreateDateColumn, Entity, Index, JoinTable,
  ManyToMany, OneToMany, PrimaryGeneratedColumn,
} from 'typeorm'
import { Task } from '../../tasks/entities/task.entity'
import { Comment } from '../../comments/entities/comment.entity'
import { Role } from '../../auth/entities/role.entity'

export type UserRole = 'owner' | 'partner'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')           id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 }) email!: string

  @Column({ type: 'varchar', length: 255, default: '', select: false }) passwordHash!: string

  // Security PIN — bcrypt-hashed 4-6 digit code that is the 3rd factor.
  // Empty string => 3FA not configured for this user (still 2FA-protected).
  @Column({ type: 'varchar', length: 255, default: '', select: false }) securityPinHash!: string

  // Feature flags. Default: 2FA on (email OTP), 3FA off (PIN optional).
  @Column({ type: 'boolean', default: true })  twoFactorEnabled!: boolean
  @Column({ type: 'boolean', default: false }) threeFactorEnabled!: boolean

  @Column({ type: 'varchar', length: 100 }) name!: string

  @Column({ type: 'varchar', length: 20 })  role!: UserRole
  @Column({ type: 'varchar', length: 7 })   avatarColor!: string
  @Column({ type: 'varchar', length: 4 })   initials!: string

  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date

  @ManyToMany(() => Role, r => r.users, { cascade: ['insert', 'update'] })
  @JoinTable({
    name: 'user_roles',
    joinColumn:        { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles!: Role[]

  @OneToMany(() => Task, t => t.assignee)  assignedTasks?: Task[]
  @OneToMany(() => Task, t => t.createdBy) createdTasks?:  Task[]
  @OneToMany(() => Comment, c => c.author) comments?:      Comment[]
}