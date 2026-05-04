// Destination: together-backend/together-backend/src/auth/dto/login.dto.ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail() email!: string

  @IsString() @IsNotEmpty() @MinLength(1)
  password!: string
}