// Destination: together-backend/together-backend/src/graphql/tasks.resolver.ts
// REPLACE the entire file. Every method is now async with a Promise return type.
import {
  Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver,
} from '@nestjs/graphql'
import { TasksService } from '../tasks/tasks.service'
import { CommentsService } from '../comments/comments.service'
import { TaskState } from '../tasks/entities/task.entity'
import { CommentGQL, PaginatedTasksGQL, TaskGQL } from './models'
import { CreateTaskInput, TasksQueryInput, UpdateTaskInput } from './inputs'

@Resolver(() => TaskGQL)
export class TasksResolver {
  constructor(
    private readonly tasks:    TasksService,
    private readonly comments: CommentsService,
  ) {}

  @Query(() => PaginatedTasksGQL, { name: 'tasks' })
  async listTasks(
    @Args('query', { nullable: true }) query?: TasksQueryInput,
  ): Promise<PaginatedTasksGQL> {
    return (await this.tasks.findAll(query ?? {})) as unknown as PaginatedTasksGQL
  }

  @Query(() => TaskGQL, { name: 'task', nullable: true })
  async getTask(@Args('id', { type: () => ID }) id: string): Promise<TaskGQL> {
    return (await this.tasks.findOne(id)) as unknown as TaskGQL
  }

  @Mutation(() => TaskGQL)
  async createTask(@Args('input') input: CreateTaskInput): Promise<TaskGQL> {
    return (await this.tasks.create(input)) as unknown as TaskGQL
  }

  @Mutation(() => TaskGQL)
  async updateTask(
    @Args('id',    { type: () => ID }) id: string,
    @Args('input')                     input: UpdateTaskInput,
  ): Promise<TaskGQL> {
    return (await this.tasks.update(id, input)) as unknown as TaskGQL
  }

  @Mutation(() => TaskGQL)
  async setTaskState(
    @Args('id',       { type: () => ID })        id: string,
    @Args('newState', { type: () => TaskState }) newState: TaskState,
  ): Promise<TaskGQL> {
    return (await this.tasks.setState(id, newState)) as unknown as TaskGQL
  }

  @Mutation(() => Boolean)
  async deleteTask(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.tasks.remove(id)
    return true
  }

  @ResolveField(() => [CommentGQL], { name: 'comments' })
  async resolveComments(@Parent() task: TaskGQL): Promise<CommentGQL[]> {
    return (await this.comments.listForTask(task.id)) as unknown as CommentGQL[]
  }

  @ResolveField(() => Int, { name: 'commentCount' })
  resolveCommentCount(@Parent() task: TaskGQL): Promise<number> {
    return this.comments.countForTask(task.id)
  }
}