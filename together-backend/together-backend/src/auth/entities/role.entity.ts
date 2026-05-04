// Destination: together-backend/together-backend/src/auth/entities/role.entity.ts
// Two roles in Bronze/Silver: 'admin' (full perms) and 'user' (restricted).
// New roles in the future plug in the same way without code changes.
import {
  Column, Entity, Index, JoinTable, ManyToMany, PrimaryGeneratedColumn,
} from 'typeorm'
import { Permission } from './permission.entity'
import { User } from '../../users/entities/user.entity'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid') id!: string

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 50 })
  name!: string                              // 'admin' | 'user'

  @Column({ type: 'varchar', length: 200, default: '' })
  description!: string

  @ManyToMany(() => Permission, p => p.roles, { cascade: ['insert', 'update'] })
  @JoinTable({
    name: 'role_permissions',
    joinColumn:        { name: 'roleId',       referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' },
  })
  permissions!: Permission[]

  @ManyToMany(() => User, u => u.roles)
  users?: User[]
}