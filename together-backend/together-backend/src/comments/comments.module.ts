import { Module, forwardRef } from '@nestjs/common'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { CommentsRepository } from './comments.repository'
import { TasksModule } from '../tasks/tasks.module'
import { UsersModule } from '../users/users.module'

@Module({
  // forwardRef because TasksModule will import CommentsModule
  // back for the cascade-on-delete hook.
  imports:     [forwardRef(() => TasksModule), UsersModule],
  controllers: [CommentsController],
  providers:   [CommentsService, CommentsRepository],
  exports:     [CommentsService, CommentsRepository],
})
export class CommentsModule {}
