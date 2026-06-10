// Destination: together-backend/together-backend/src/app.module.ts
// REPLACE — registers ScheduleModule (required for @Cron in
// AiAnomalyService) and TagsModule.
import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { DatabaseModule } from './database/database.module'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'
import { StatsModule } from './stats/stats.module'
import { CommentsModule } from './comments/comments.module'
import { GraphqlAppModule } from './graphql/graphql.module'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { LogsModule } from './logging/logs.module'
import { TagsModule } from './tags/tags.module'

@Module({
  imports: [
    DatabaseModule,           // ← FIRST so every other module can DI repos
    ScheduleModule.forRoot(), // ← required for @Cron decorators
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    AuthModule,
    TasksModule,
    UsersModule,
    TagsModule,
    StatsModule,
    CommentsModule,
    ChatModule,
    LogsModule,
    GraphqlAppModule,
  ],
})
export class AppModule {}