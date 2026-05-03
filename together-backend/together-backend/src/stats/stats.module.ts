import { Module } from '@nestjs/common'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { TasksModule } from '../tasks/tasks.module'
import { UsersModule } from '../users/users.module'
import { CommentsModule } from '../comments/comments.module'

@Module({
  imports:     [TasksModule, UsersModule, CommentsModule],
  controllers: [StatsController],
  providers:   [StatsService],
  exports:     [StatsService],
})
export class StatsModule {}
