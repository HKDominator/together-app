// Destination: together-backend/together-backend/src/users/admin-users.controller.ts
// NEW. Demonstrates permission gating end-to-end:
//   GET    /api/admin/users        → admin only (lists users with role names)
//   DELETE /api/admin/users/:id    → admin only
//
// A user without 'user.manage' gets 403; a user with it gets the data.
import {
  Controller, Delete, Get, NotFoundException, Param, UseGuards,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Controller('admin/users')
@UseGuards(AuthGuard, PermissionsGuard)
@RequirePermissions('user.manage')
export class AdminUsersController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  @Get()
  async list() {
    const users = await this.users.find({ relations: { roles: true } })
    return users.map(u => ({
      id: u.id, email: u.email, name: u.name,
      role: u.role,
      authRoles: (u.roles ?? []).map(r => r.name),
      createdAt: u.createdAt,
    }))
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const r = await this.users.delete(id)
    if (!r.affected) throw new NotFoundException(`User ${id} not found`)
    return { ok: true }
  }
}