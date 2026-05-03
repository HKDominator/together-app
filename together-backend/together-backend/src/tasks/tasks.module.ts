import { Module, forwardRef } from '@nestjs/common'
import { TasksController } from './tasks.controller'
import { GeneratorController } from './generator.controller'
import { TasksService } from './tasks.service'
import { TasksRepository } from './tasks.repository'
import { TasksGateway } from './tasks.gateway'
import { TaskGeneratorService } from './task-generator.service'
import { UsersModule } from '../users/users.module'
import { CommentsModule } from '../comments/comments.module'

@Module({
  // forwardRef breaks the TasksModule ↔ CommentsModule circular
  // dependency (tasks imports comments for cascade; comments imports
  // tasks to validate taskId existence).
  imports:     [UsersModule, forwardRef(() => CommentsModule)],
  controllers: [TasksController, GeneratorController],
  providers: [
    TasksService,
    TasksRepository,
    TasksGateway,
    TaskGeneratorService,
  ],
  exports:     [TasksService, TasksRepository, TasksGateway],
})
export class TasksModule {}
