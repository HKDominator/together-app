// Destination: together-backend/together-backend/src/graphql/comments.resolver.ts
// REPLACE the entire file.
import {
  Args, ID, Mutation, Query, Resolver,
} from '@nestjs/graphql'
import { UseGuards } from '@nestjs/common'
import { CommentsService } from '../comments/comments.service'
import { CommentGQL } from './models'
import { CreateCommentInput, UpdateCommentInput } from './inputs'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'

@Resolver(() => CommentGQL)
@UseGuards(AuthGuard, PermissionsGuard)   // SEC-01: mirror the REST comments controller
export class CommentsResolver {
  constructor(private readonly comments: CommentsService) {}

  @Query(() => [CommentGQL], { name: 'commentsForTask' })
  @RequirePermissions('task.read')
  async list(@Args('taskId', { type: () => ID }) taskId: string): Promise<CommentGQL[]> {
    return (await this.comments.listForTask(taskId)) as unknown as CommentGQL[]
  }

  @Mutation(() => CommentGQL)
  @RequirePermissions('comment.create')
  async addComment(
    @Args('taskId', { type: () => ID }) taskId: string,
    @Args('input')                      input:  CreateCommentInput,
  ): Promise<CommentGQL> {
    return (await this.comments.create(taskId, input)) as unknown as CommentGQL
  }

  @Mutation(() => CommentGQL)
  @RequirePermissions('comment.update')
  async editComment(
    @Args('id',    { type: () => ID }) id:    string,
    @Args('input')                     input: UpdateCommentInput,
  ): Promise<CommentGQL> {
    return (await this.comments.update(id, input)) as unknown as CommentGQL
  }

  @Mutation(() => Boolean)
  @RequirePermissions('comment.delete')
  async deleteComment(@Args('id', { type: () => ID }) id: string): Promise<boolean> {
    await this.comments.remove(id)
    return true
  }
}