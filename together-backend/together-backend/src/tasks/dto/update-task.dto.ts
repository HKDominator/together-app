import { PartialType } from '@nestjs/mapped-types'
import { CreateTaskDto } from './create-task.dto'

/**
 * Everything from CreateTaskDto, but optional. All validation rules
 * carry over automatically.
 *
 * Note: `state` is deliberately NOT part of this DTO. State changes
 * must go through `PATCH /api/tasks/:id/state` so the state machine
 * check is always enforced — allowing arbitrary state updates via
 * generic PATCH would be a bypass.
 */
export class UpdateTaskDto extends PartialType(CreateTaskDto) {}
