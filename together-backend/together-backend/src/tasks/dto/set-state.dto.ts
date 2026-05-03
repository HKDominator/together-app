import { IsEnum } from 'class-validator'
import { TaskState } from '../entities/task.entity'

export class SetStateDto {
  @IsEnum(TaskState, { message: 'newState must be todo, in_progress, done, or cancelled' })
  newState!: TaskState
}
