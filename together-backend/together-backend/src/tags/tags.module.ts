// Destination: together-backend/together-backend/src/tags/tags.module.ts
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Tag } from './entities/tag.entity'
import { TaskTag } from './entities/task-tag.entity'
import { TagsService } from './tags.service'
import { TagsController } from './tags.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports:     [TypeOrmModule.forFeature([Tag, TaskTag]), AuthModule],
  controllers: [TagsController],
  providers:   [TagsService],
  exports:     [TagsService, TypeOrmModule],
})
export class TagsModule {}