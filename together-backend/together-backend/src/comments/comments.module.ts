// Destination: together-backend/together-backend/src/comments/comments.module.ts
import { Module, forwardRef } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'
import { CommentsRepository } from './comments.repository'
import { Comment } from './entities/comment.entity'
import { TasksModule } from '../tasks/tasks.module'
import { UsersModule } from '../users/users.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    forwardRef(() => TasksModule),
    UsersModule,
    AuthModule,
  ],
  controllers: [CommentsController],
  providers:   [CommentsService, CommentsRepository],
  exports:     [CommentsService, CommentsRepository],
})
export class CommentsModule {}