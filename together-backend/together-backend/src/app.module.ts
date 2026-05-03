import { Module } from '@nestjs/common'
import { TasksModule } from './tasks/tasks.module'
import { UsersModule } from './users/users.module'
import { StatsModule } from './stats/stats.module'
import { CommentsModule } from './comments/comments.module'
import { GraphqlAppModule } from './graphql/graphql.module'

@Module({
  imports: [
    TasksModule,
    UsersModule,
    StatsModule,
    CommentsModule,
    GraphqlAppModule,
  ],
})
export class AppModule {}
