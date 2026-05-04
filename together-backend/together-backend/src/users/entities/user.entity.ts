// Destination: together-backend/together-backend/src/users/entities/user.entity.ts
// REPLACE — adds the M:M relation to Role. Note: User.role (owner/partner)
// stays as it is — that's a workspace-identity field, separate from the
// authorization role. They mean different things and live in different
// tables. Comments inline.
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
  @PrimaryGeneratedColumn('uuid')          id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 }) email!: string

  @Column({ type: 'varchar', length: 255, default: '' }) passwordHash!: string

  @Column({ type: 'varchar', length: 100 }) name!: string

  // Workspace identity: who is this person to the couple. NOT a permission.
  @Column({ type: 'varchar', length: 20 })  role!: UserRole

  @Column({ type: 'varchar', length: 7 })   avatarColor!: string
  @Column({ type: 'varchar', length: 4 })   initials!: string

  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date

  // Authorization roles (admin / user). Separate from `role` above.
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