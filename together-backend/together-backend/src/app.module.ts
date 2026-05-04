// Destination: together-backend/together-backend/src/app.module.ts
import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'
import { StatsModule } from './stats/stats.module'
import { CommentsModule } from './comments/comments.module'
import { GraphqlAppModule } from './graphql/graphql.module'
import { AuthModule } from './auth/auth.module'
import { ChatModule } from './chat/chat.module'
import { LogsModule } from './logging/logs.module'

@Module({
  imports: [
    DatabaseModule,        // ← FIRST so every other module can DI repos
    AuthModule,
    TasksModule,
    UsersModule,
    StatsModule,
    CommentsModule,
    ChatModule,
    LogsModule,
    GraphqlAppModule,
  ],
})
export class AppModule {}