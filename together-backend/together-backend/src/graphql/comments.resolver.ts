// Destination: together-backend/together-backend/src/graphql/comments.resolver.ts
// REPLACE the entire file.
import {
  Args, ID, Mutation, Query, Resolver,
} from '@nestjs/graphql'
import { CommentsService } from '../comments/comments.service'
import { CommentGQL } from './models'
import { CreateCommentInput, UpdateCommentInput } from './inputs'

@Resolver(() => CommentGQL)
export class CommentsResolver {
  constructor(private readonly comments: CommentsService) {}

  @Query(() => [CommentGQL], { name: 'commentsForTask' })
  async list(@Args('taskId', { type: () => ID }) taskId: string): Promise<CommentGQL[]> {
    return (await this.comments.listForTask(taskId)) as unknown as CommentGQL[]
  }

  @Mutation(() => CommentGQL)
  async addComment(
    @Args('taskId', { type: () => ID }) taskId: string,
    @Args('input')                      input:  CreateCommentInput,
  ): Promise<CommentGQL> {
    return (await this.comments.create(taskId, input)) as unknown as CommentGQL
  }

  @Mutation(() => CommentGQL)
  async editComment(
    @Args('id',    { type: () => ID }) id:    string,
    @Args('input')                     input: UpdateCommentInput,
  ): Promise<CommentGQL> {
    return (await this.comments.update(id, input)) as unknown as CommentGQL
  }

  @Mutation(() => Boolean)
  async deleteComment(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.comments.remove(id)
    return true
  }
}