// Destination: together-backend/together-backend/src/tags/tags.controller.ts
import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { TagsService } from './tags.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator'
import { IsString, IsUUID, Length, IsOptional, Matches } from 'class-validator'

class CreateTagDto {
  @IsString() @Length(2, 50)        name!: string
  @IsOptional() @IsString() @Matches(/^#[0-9a-fA-F]{6}$/)
                                    color?: string
  @IsOptional() @IsString()         kind?: string
}

class AttachTagDto {
  @IsUUID() tagId!: string
}

@Controller('tags')
@UseGuards(AuthGuard)
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get()
  list() { return this.tags.list() }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('user.manage')
  create(@Body() dto: CreateTagDto) { return this.tags.create(dto) }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('user.manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) { return this.tags.remove(id) }

  // ── Attach / detach (any authed user) ────────────────────────
  @Post('task/:taskId')
  @HttpCode(HttpStatus.OK)
  async attach(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: AttachTagDto,
    @Req() req: Request,
  ) {
    const userId = (req as Request & { user?: { id: string } }).user?.id ?? null
    return this.tags.attach(taskId, dto.tagId, userId)
  }

  @Delete('task/:taskId/:tagId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async detach(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Param('tagId',  ParseUUIDPipe) tagId:  string,
  ) {
    const ok = await this.tags.detach(taskId, tagId)
    if (!ok) throw new NotFoundException('Not attached')
  }

  @Get('task/:taskId')
  forTask(@Param('taskId', ParseUUIDPipe) taskId: string) {
    return this.tags.tagsForTask(taskId)
  }
}