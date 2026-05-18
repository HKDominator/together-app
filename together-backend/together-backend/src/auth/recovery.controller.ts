// Destination: together-backend/src/auth/recovery.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator'
import { RecoveryService } from './recovery.service'

class RecoverRequestDto {
  @IsEmail() email!: string
}
class RecoverResetDto {
  @IsEmail() email!: string
  @IsString() @Length(6, 6) code!: string
  @IsString() @MinLength(8) newPassword!: string
}

@Controller('auth/recover')
export class RecoveryController {
  constructor(private readonly recovery: RecoveryService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  request(@Body() dto: RecoverRequestDto) {
    return this.recovery.request(dto.email)
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  reset(@Body() dto: RecoverResetDto) {
    return this.recovery.reset(dto.email, dto.code, dto.newPassword)
  }
}