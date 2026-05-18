// Destination: together-backend/src/tasks/tasks.module.ts
// REPLACE — adds AuthModule for the guards.
import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TasksController } from './tasks.controller'
import { GeneratorController } from './generator.controller'
import { TasksService } from './tasks.service'
import { TasksRepository } from './tasks.repository'
import { TasksGateway } from './tasks.gateway'
import { TaskGeneratorService } from './task-generator.service'
import { Task } from './entities/task.entity'
import { UsersModule } from '../users/users.module'
import { CommentsModule } from '../comments/comments.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    UsersModule,
    AuthModule,
    forwardRef(() => CommentsModule),
  ],
  controllers: [TasksController, GeneratorController],
  providers:   [TasksService, TasksRepository, TasksGateway, TaskGeneratorService],
  exports:     [TasksService, TasksRepository, TasksGateway],
})
export class TasksModule {}