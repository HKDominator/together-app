// Destination: together-backend/together-backend/src/users/users.module.ts
// REPLACE — registers AdminUsersController and depends on AuthModule
// (for the guards).
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import { AdminUsersController } from './admin-users.controller'
import { User } from './entities/user.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports:     [TypeOrmModule.forFeature([User]), AuthModule],
  controllers: [UsersController, AdminUsersController],
  providers:   [UsersService, UsersRepository],
  exports:     [UsersService, UsersRepository],
})
export class UsersModule {}