// Destination: together-backend/src/auth/auth.controller.ts
// REPLACE — registration, multi-step login, refresh, logout, /me.
// Sessions list + revoke endpoints live in sessions.controller.ts (Silver).
import {
  Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Req, Res, UseGuards,
} from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { VerifyPinDto } from './dto/verify-pin.dto'
import { AuthGuard, ACCESS_COOKIE, REFRESH_COOKIE } from './guards/auth.guard'
import { CurrentUser } from './decorators/current-user.decorator'
import type { User } from '../users/entities/user.entity'
import { JwtUtil } from './jwt-util.service'
import { MailerService } from './mailer.service'

const meta = (req: Request) => ({
  ip:        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
              || req.socket.remoteAddress
              || '',
  userAgent: (req.headers['user-agent'] as string) || '',
})

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwtUtil: JwtUtil,
    private readonly mailer: MailerService,
  ) {}

  // ── POST /auth/register ──────────────────────────────────────────
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req()  req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.register({
      email:    dto.email,
      password: dto.password,
      name:     dto.name,
      pin:      dto.securityPin,
    }, meta(req))
    this.setAuthCookies(res, result.accessToken, result.refreshToken)
    return result
  }

  // ── POST /auth/login (step 1: password) ──────────────────────────
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req()  req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const stage = await this.auth.beginLogin(dto.email, dto.password, meta(req))
    if (stage.stage === 'done') {
      this.setAuthCookies(res, stage.result.accessToken, stage.result.refreshToken)
    }
    return stage
  }

  // ── POST /auth/login/otp (step 2) ────────────────────────────────
  @Post('login/otp')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Req()  req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const stage = await this.auth.verifyOtp(dto.attemptId, dto.code, meta(req))
    if (stage.stage === 'done') {
      this.setAuthCookies(res, stage.result.accessToken, stage.result.refreshToken)
    }
    return stage
  }

  // ── POST /auth/login/pin (step 3) ────────────────────────────────
  @Post('login/pin')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.OK)
  async verifyPin(
    @Body() dto: VerifyPinDto,
    @Req()  req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.verifyPin(dto.attemptId, dto.pin, meta(req))
    this.setAuthCookies(res, result.accessToken, result.refreshToken)
    return { stage: 'done', result }
  }

  // ── POST /auth/refresh — get a new access token ──────────────────
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE]
      ?? req.body?.refreshToken
    if (!refreshToken) {
      res.status(401)
      return { message: 'No refresh token' }
    }
    const result = await this.auth.refresh(refreshToken)
    this.setAuthCookies(res, result.accessToken, result.refreshToken)
    return result
  }

  // ── POST /auth/logout ─────────────────────────────────────────────
  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const session = (req as Request & { session?: { id: string } }).session
    if (session) await this.auth.logout(session.id)
    res.clearCookie(ACCESS_COOKIE)
    res.clearCookie(REFRESH_COOKIE)
  }

  // ── GET /auth/me ──────────────────────────────────────────────────
  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: User) {
    return {
      user:        this.auth.toUserPayload(user),
      roles:       (user.roles ?? []).map(r => r.name),
      permissions: this.auth.permissionsOf(user),
    }
  }

  // ── GET /auth/dev/inbox — lab-only OTP retrieval ────────────────
  // Hard-gated: only reachable when the mailer is explicitly in dev mode
  // (MAIL_DEV=true, non-production). Outside that it behaves as if the route
  // does not exist, so it can never be used as an OTP / reset-code oracle
  // in production (SEC-02).
  @Get('dev/inbox')
  devInbox(@Req() req: Request) {
    if (!this.mailer.isDev()) throw new NotFoundException()
    const email = (req.query.email as string) || ''
    if (!email) return { message: 'pass ?email=foo@bar' }
    return this.mailer.peek(email) ?? { empty: true }
  }

  // ── Cookie helper ────────────────────────────────────────────────
  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    // Cross-site (Vercel frontend ↔ Render backend on different domains)
    // requires SameSite=None, which browsers only accept with Secure=true.
    // Locally we stay on Lax + insecure so plain-HTTP dev still works.
    const crossSite = process.env.COOKIE_CROSS_SITE === 'true'
    const common = {
      httpOnly: true as const,
      sameSite: (crossSite ? 'none' : 'lax') as 'none' | 'lax',
      secure:   crossSite || !!process.env.HTTPS_KEY,
    }
    res.cookie(ACCESS_COOKIE, accessToken, {
      ...common,
      maxAge: this.jwtUtil.accessTtl * 1000,
    })
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...common,
      maxAge: this.jwtUtil.refreshTtl * 1000,
    })
  }
}