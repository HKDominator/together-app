// Destination: together-backend/src/auth/dto/verify-pin.dto.ts
import { IsString, Matches, IsUUID } from 'class-validator'
export class VerifyPinDto {
  @IsUUID() attemptId!: string
  @IsString() @Matches(/^\d{4,6}$/) pin!: string
}