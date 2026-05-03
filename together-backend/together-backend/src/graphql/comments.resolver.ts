import {
  Args,
  ID,
  Mutation,
  Query,
  Resolver,
} from '@nestjs/graphql'
import { CommentsService } from '../comments/comments.service'
import { CommentGQL } from './models'
import { CreateCommentInput, UpdateCommentInput } from './inputs'

@Resolver(() => CommentGQL)
export class CommentsResolver {
  constructor(private readonly comments: CommentsService) {}

  @Query(() => [CommentGQL], { name: 'commentsForTask' })
  list(@Args('taskId', { type: () => ID }) taskId: string): CommentGQL[] {
    return this.comments.listForTask(taskId) as CommentGQL[]
  }

  @Mutation(() => CommentGQL)
  addComment(
    @Args('taskId', { type: () => ID }) taskId: string,
    @Args('input')                      input:  CreateCommentInput,
  ): CommentGQL {
    return this.comments.create(taskId, input) as CommentGQL
  }

  @Mutation(() => CommentGQL)
  editComment(
    @Args('id',    { type: () => ID }) id:    string,
    @Args('input')                     input: UpdateCommentInput,
  ): CommentGQL {
    return this.comments.update(id, input) as CommentGQL
  }

  @Mutation(() => Boolean)
  deleteComment(@Args('id', { type: () => ID }) id: string): boolean {
    this.comments.remove(id)
    return true
  }
}
