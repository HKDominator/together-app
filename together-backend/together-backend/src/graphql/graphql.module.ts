// ─────────────────────────────────────────────────────────────────────
// Destination: src/graphql/graphql.module.ts
// Updates:
//   - `plugins` now registers ApolloServerPluginLandingPageLocalDefault
//     which serves the interactive Sandbox IDE at GET /graphql. Without
//     this, a bare GET just errors out because Apollo expects a query
//     string.
//   - CSRF still disabled for dev.
// ─────────────────────────────────────────────────────────────────────
import { Module } from '@nestjs/common'
import { GraphQLModule } from '@nestjs/graphql'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { join } from 'path'
import { TasksResolver } from './tasks.resolver'
import { CommentsResolver } from './comments.resolver'
import { StatsResolver, UsersResolver } from './misc.resolvers'
import { TasksModule } from '../tasks/tasks.module'
import { CommentsModule } from '../comments/comments.module'
import { UsersModule } from '../users/users.module'
import { StatsModule } from '../stats/stats.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    AuthModule,        // SEC-01: provides AuthGuard / PermissionsGuard / JwtUtil + user/session repos to resolvers
    TasksModule,
    CommentsModule,
    UsersModule,
    StatsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver:         ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/graphql/schema.gql'),
      sortSchema:     true,
      playground:     false,       // old playground — superseded by Sandbox
      introspection:  true,
      csrfPrevention: false,       // dev-only
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({ embed: true }),
      ],
    }),
  ],
  providers: [
    TasksResolver,
    CommentsResolver,
    StatsResolver,
    UsersResolver,
  ],
})
export class GraphqlAppModule {}