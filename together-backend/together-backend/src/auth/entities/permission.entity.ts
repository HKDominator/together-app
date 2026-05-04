// Destination: together-backend/together-backend/src/auth/entities/permission.entity.ts
// Granular capability — e.g. 'task.delete', 'user.manage', 'log.view'.
// Roles aggregate these via the role_permissions join table.
import {
  Column, Entity, Index, ManyToMany, PrimaryGeneratedColumn,
} from 'typeorm'
import { Role } from './role.entity'

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 80 })
  name!: string                              // e.g. 'task.delete'

  @Column({ type: 'varchar', length: 200, default: '' })
  description!: string

  @ManyToMany(() => Role, r => r.permissions)
  roles?: Role[]
}