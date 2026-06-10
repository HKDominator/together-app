// Destination: together-backend/together-backend/src/graphql/misc.resolvers.ts
// REPLACE the entire file. Both resolvers now async.
import { Query, Resolver } from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { StatsService } from '../stats/stats.service'
import { UsersService } from '../users/users.service'
import { TasksStatsGQL, UserGQL } from './models'
import { AuthGuard } from '../auth/guards/auth.guard'

// SEC-01: the REST /stats and /users controllers carry no guards, so a
// literal mirror would leave these GraphQL queries open. Require
// authentication here (login) — see follow-up note to also guard the REST
// controllers. UserGQL never exposes email/passwordHash.
@Resolver()
@UseGuards(AuthGuard)
export class StatsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => TasksStatsGQL, { name: 'stats' })
  async get(): Promise<TasksStatsGQL> {
    return (await this.stats.compute()) as unknown as TasksStatsGQL
  }
}

@Resolver(() => UserGQL)
@UseGuards(AuthGuard)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => [UserGQL], { name: 'users' })
  async list(): Promise<UserGQL[]> {
    return (await this.users.findAll()) as unknown as UserGQL[]
  }
}