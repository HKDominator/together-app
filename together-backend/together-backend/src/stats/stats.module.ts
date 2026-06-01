// Destination: together-backend/together-backend/src/stats/stats.module.ts
// REPLACE — now also registers the Gold tag-affinity stat.
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StatsController } from './stats.controller'
import { StatsService } from './stats.service'
import { TagAffinityController } from './tag-affinity.controller'
import { TagAffinityService } from './tag-affinity.service'
import { TasksModule } from '../tasks/tasks.module'
import { UsersModule } from '../users/users.module'
import { CommentsModule } from '../comments/comments.module'
import { TagsModule } from '../tags/tags.module'
import { AuthModule } from '../auth/auth.module'
import { Task } from '../tasks/entities/task.entity'
import { Tag } from '../tags/entities/tag.entity'
import { TaskTag } from '../tags/entities/task-tag.entity'
import { User } from '../users/entities/user.entity'

@Module({
  imports: [
    TasksModule, UsersModule, CommentsModule, TagsModule, AuthModule,
    // Tag-affinity service needs raw repository access for the
    // naive() implementation — sql() uses DataSource directly.
    TypeOrmModule.forFeature([Task, Tag, TaskTag, User]),
  ],
  controllers: [StatsController, TagAffinityController],
  providers:   [StatsService, TagAffinityService],
  exports:     [StatsService, TagAffinityService],
})
export class StatsModule {}