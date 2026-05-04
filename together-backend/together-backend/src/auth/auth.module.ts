// Destination: together-backend/together-backend/src/auth/auth.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { AuthGuard } from './guards/auth.guard'
import { PermissionsGuard } from './guards/permissions.guard'
import { Role } from './entities/role.entity'
import { Permission } from './entities/permission.entity'
import { User } from '../users/entities/user.entity'

@Module({
  imports:     [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [AuthController],
  // Export guards so other modules can @UseGuards(AuthGuard, PermissionsGuard)
  providers:   [AuthService, AuthGuard, PermissionsGuard],
  exports:     [AuthService, AuthGuard, PermissionsGuard, TypeOrmModule],
})
export class AuthModule {}