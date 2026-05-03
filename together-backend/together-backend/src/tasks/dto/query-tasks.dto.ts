import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'
import { Priority, TaskState } from '../entities/task.entity'

export class QueryTasksDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)        // cap so a client can't request 1_000_000 items
  perPage?: number = 10

  @IsOptional()
  @IsEnum(TaskState)
  state?: TaskState

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority

  @IsOptional()
  @IsString()
  assigneeId?: string

  @IsOptional()
  @IsString()
  search?: string  // case-insensitive substring match on title
}
