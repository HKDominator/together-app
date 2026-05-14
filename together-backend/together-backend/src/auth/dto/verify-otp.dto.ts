// Destination: together-backend/src/auth/dto/verify-otp.dto.ts
import { IsString, Length, IsUUID } from 'class-validator'
export class VerifyOtpDto {
  @IsUUID() attemptId!: string
  @IsString() @Length(6, 6) code!: string
}