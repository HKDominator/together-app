// ─────────────────────────────────────────────────────────────────────
// Destination: src/graphql/models.ts
// Fix: NestJS GraphQL requires explicit type arguments on @Field when
// the field is nullable. `string | null` can't be reflected because TS
// strips `null` from runtime type metadata — only the TS type remains.
// Affects: TaskGQL.dueDate.
// ─────────────────────────────────────────────────────────────────────
import {
  Field,
  ID,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'
import { Priority, TaskState } from '../tasks/entities/task.entity'

registerEnumType(Priority,  { name: 'Priority' })
registerEnumType(TaskState, { name: 'TaskState' })

@ObjectType()
export class UserGQL {
  @Field(() => ID) id!: string
  @Field()         name!: string
  @Field()         role!: string
  @Field()         avatarColor!: string
  @Field()         initials!: string
}

@ObjectType('Task')
export class TaskGQL {
  @Field(() => ID) id!: string
  @Field()         title!: string
  @Field()         description!: string
  @Field()         assigneeId!: string
  @Field()         createdById!: string
  @Field(() => Priority)  priority!: Priority
  @Field(() => TaskState) state!: TaskState
  @Field(() => String, { nullable: true }) dueDate?: string | null
  @Field()         createdAt!: string
  @Field()         updatedAt!: string

  @Field(() => [CommentGQL])
  comments!: CommentGQL[]

  @Field(() => Int)
  commentCount!: number
}

@ObjectType('Comment')
export class CommentGQL {
  @Field(() => ID) id!: string
  @Field()         taskId!: string
  @Field()         authorId!: string
  @Field()         body!: string
  @Field()         createdAt!: string
  @Field()         updatedAt!: string
}

@ObjectType('PaginatedTasks')
export class PaginatedTasksGQL {
  @Field(() => [TaskGQL]) items!: TaskGQL[]
  @Field(() => Int)       total!: number
  @Field(() => Int)       page!: number
  @Field(() => Int)       perPage!: number
  @Field(() => Int)       totalPages!: number
}

@ObjectType()
export class ByStateGQL {
  @Field(() => Int) todo!: number
  @Field(() => Int) in_progress!: number
  @Field(() => Int) done!: number
  @Field(() => Int) cancelled!: number
}

@ObjectType()
export class ByPriorityGQL {
  @Field(() => Int) high!: number
  @Field(() => Int) medium!: number
  @Field(() => Int) low!: number
}

@ObjectType()
export class UserStatsGQL {
  @Field() userId!: string
  @Field(() => Int) total!: number
  @Field(() => Int) done!: number
}

@ObjectType()
export class TopCommentedTaskGQL {
  @Field() taskId!: string
  @Field() title!: string
  @Field(() => Int) count!: number
}

@ObjectType('TasksStats')
export class TasksStatsGQL {
  @Field(() => Int)            total!: number
  @Field(() => ByStateGQL)     byState!: ByStateGQL
  @Field(() => ByPriorityGQL)  byPriority!: ByPriorityGQL
  @Field(() => [UserStatsGQL]) byUser!: UserStatsGQL[]
  @Field(() => Int) overdue!: number
  @Field(() => Int) completionRate!: number
  @Field(() => Int) recentCount!: number
  @Field(() => [TopCommentedTaskGQL]) topCommentedTasks!: TopCommentedTaskGQL[]
}