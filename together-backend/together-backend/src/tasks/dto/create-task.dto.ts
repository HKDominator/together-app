import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Matches,
} from 'class-validator'
import { Priority } from '../entities/task.entity'

// Matches YYYY-MM-DD. Keeping it a string because the frontend uses
// <input type="date"> which produces this format directly.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @Length(3, 100, { message: 'Title must be 3–100 characters' })
  title!: string

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must be under 500 characters' })
  description?: string

  @IsString()
  @IsNotEmpty({ message: 'Please select an assignee' })
  assigneeId!: string

  @IsEnum(Priority, { message: 'Priority must be high, medium, or low' })
  priority!: Priority

  @IsOptional()
  @Matches(ISO_DATE, { message: 'Due date must be in YYYY-MM-DD format' })
  dueDate?: string | null
}
