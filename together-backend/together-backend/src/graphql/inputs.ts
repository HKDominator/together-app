// ─────────────────────────────────────────────────────────────────────
// Destination: src/graphql/inputs.ts
// Fix: Every @Field({ nullable: true }) on a string property now has
// an explicit `() => String` type argument. Nullable string fields
// can't be inferred from TS metadata in code-first GraphQL — the
// `| undefined`/`| null` type union strips the type info at runtime.
// ─────────────────────────────────────────────────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql'
import { Priority, TaskState } from '../tasks/entities/task.entity'

@InputType()
export class CreateTaskInput {
  @Field()               title!: string
  @Field(() => String, { nullable: true }) description?: string
  @Field()               assigneeId!: string
  @Field(() => Priority) priority!: Priority
  @Field(() => String, { nullable: true }) dueDate?: string
}

@InputType()
export class UpdateTaskInput {
  @Field(() => String,   { nullable: true }) title?: string
  @Field(() => String,   { nullable: true }) description?: string
  @Field(() => String,   { nullable: true }) assigneeId?: string
  @Field(() => Priority, { nullable: true }) priority?: Priority
  @Field(() => String,   { nullable: true }) dueDate?: string
}

@InputType()
export class TasksQueryInput {
  @Field(() => Int,       { nullable: true }) page?: number
  @Field(() => Int,       { nullable: true }) perPage?: number
  @Field(() => TaskState, { nullable: true }) state?: TaskState
  @Field(() => Priority,  { nullable: true }) priority?: Priority
  @Field(() => String,    { nullable: true }) assigneeId?: string
  @Field(() => String,    { nullable: true }) search?: string
}

@InputType()
export class CreateCommentInput {
  @Field() body!: string
}

@InputType()
export class UpdateCommentInput {
  @Field() body!: string
}