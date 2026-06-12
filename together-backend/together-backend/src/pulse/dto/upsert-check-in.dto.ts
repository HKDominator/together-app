import { IsIn } from 'class-validator'
import { MOODS, ENERGIES } from '../reading'
import type { Mood, Energy } from '../reading'

export class UpsertCheckInDto {
  @IsIn([...MOODS])
  mood!: Mood

  @IsIn([...ENERGIES])
  energy!: Energy
}
