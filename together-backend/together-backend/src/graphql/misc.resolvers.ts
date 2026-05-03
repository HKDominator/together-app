import { Query, Resolver } from '@nestjs/graphql'
import { StatsService } from '../stats/stats.service'
import { UsersService } from '../users/users.service'
import { TasksStatsGQL, UserGQL } from './models'

@Resolver()
export class StatsResolver {
  constructor(private readonly stats: StatsService) {}

  @Query(() => TasksStatsGQL, { name: 'stats' })
  get(): TasksStatsGQL {
    return this.stats.compute() as unknown as TasksStatsGQL
  }
}

@Resolver(() => UserGQL)
export class UsersResolver {
  constructor(private readonly users: UsersService) {}

  @Query(() => [UserGQL], { name: 'users' })
  list(): UserGQL[] {
    return this.users.findAll() as UserGQL[]
  }
}
