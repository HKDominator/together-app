// Destination: together-backend/src/auth/dto/register.dto.ts
import {
  IsEmail, IsOptional, IsString, Length, Matches, MinLength,
} from 'class-validator'
export class RegisterDto {
  @IsEmail() email!: string

  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string

  @IsString() @Length(2, 100, { message: 'Name must be 2–100 characters' })
  name!: string

  // 4–6 digit PIN, optional. Without it, 3FA is OFF for this user.
  @IsOptional()
  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4–6 digits' })
  securityPin?: string
}