// Destination: together-backend/together-backend/src/auth/auth.controller.ts
import {
  Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { AuthGuard, SESSION_COOKIE } from './guards/auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import type { User } from '../users/entities/user.entity'

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, result } = await this.auth.login(dto.email, dto.password)
    // Cookie holds the user's UUID. Plain — see assignment note about
    // not requiring tokens or encryption for this iteration.
    res.cookie(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge:   ONE_WEEK_MS,
    })
    return result
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(SESSION_COOKIE)
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return this.auth.toResult(user)
  }
}