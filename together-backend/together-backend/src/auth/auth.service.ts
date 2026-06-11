// Destination: together-backend/src/auth/auth.service.ts
// REPLACE — supports registration, 3-step login (password → OTP → PIN),
// JWT issuance, session creation, refresh, logout. Helpers are reused
// across Bronze and Silver — the gating between 2FA and 3FA is just
// a boolean check on the user record.
import {
  BadRequestException, ConflictException, Injectable, Logger,
  NotFoundException, UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { User } from '../users/entities/user.entity'
import { Role } from './entities/role.entity'
import { Session } from './entities/session.entity'
import { LoginAttempt } from './entities/login-attempt.entity'
import { JwtUtil } from './jwt-util.service'
import { MailerService } from './mailer.service'

export interface AuthUserPayload {
  id: string; email: string; name: string; coupleRole: string
  avatarColor: string; initials: string
  twoFactorEnabled: boolean; threeFactorEnabled: boolean
}

export interface LoginResult {
  user:        AuthUserPayload
  roles:       string[]
  permissions: string[]
  accessToken: string
  refreshToken: string
  expiresIn:   number      // seconds — used by the frontend's idle timer
}

export type LoginStageResult =
  | { stage: 'otp'; attemptId: string; expiresIn: number; devOtp?: string }
  | { stage: 'pin'; attemptId: string; expiresIn: number }
  | { stage: 'done'; result: LoginResult }

const OTP_TTL_SEC      = 10 * 60   // 10 minutes
const MAX_OTP_ATTEMPTS = 5
const MAX_PIN_ATTEMPTS = 5         // SEC-06: cap PIN tries so it can't be brute-forced

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name)
  private readonly idleTimeoutSec:    number
  private readonly sessionAbsoluteSec:number

  constructor(
    @InjectRepository(User)         private readonly users:    Repository<User>,
    @InjectRepository(Role)         private readonly roles:    Repository<Role>,
    @InjectRepository(Session)      private readonly sessions: Repository<Session>,
    @InjectRepository(LoginAttempt) private readonly attempts: Repository<LoginAttempt>,
    private readonly jwtUtil: JwtUtil,
    private readonly mailer:  MailerService,
    cfg: ConfigService,
  ) {
    this.idleTimeoutSec     = Number(cfg.get('IDLE_TIMEOUT_SEC',     '900'))    // 15 min
    this.sessionAbsoluteSec = Number(cfg.get('SESSION_ABSOLUTE_SEC', '604800')) // 7 days
  }

  // ── Registration ─────────────────────────────────────────────────
  async register(
    input: { email: string; password: string; name: string; pin?: string },
    meta: { ip: string; userAgent: string } = { ip: '', userAgent: '' },
  ): Promise<LoginResult> {
    const existing = await this.users.findOne({ where: { email: input.email } })
    if (existing) throw new ConflictException('Email already in use')

    // Default everyone to the 'user' role on signup. Admin promotion is
    // a separate (admin-only) operation.
    const userRole = await this.roles.findOne({
      where: { name: 'user' }, relations: { permissions: true },
    })
    if (!userRole) throw new Error('Role "user" not seeded — run npm run seed first')

    const passwordHash = await bcrypt.hash(input.password, 10)
    const pinHash      = input.pin ? await bcrypt.hash(input.pin, 10) : ''

    const initials = input.name
      .split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase()

    const user = await this.users.save(this.users.create({
      email:               input.email.toLowerCase(),
      passwordHash,
      securityPinHash:     pinHash,
      twoFactorEnabled:    true,            // default ON for everyone
      threeFactorEnabled:  pinHash.length > 0,
      name:                input.name,
      coupleRole:          'partner',
      avatarColor:         '#' + ((Math.random() * 0xffffff) | 0).toString(16).padStart(6, '0'),
      initials:            initials || 'U?',
      roles:               [userRole],
    }))

    // Skip MFA on first login right after register — UX trade-off so a
    // newly registered user lands in the app immediately. They'll go
    // through MFA next time.
    return this.completeLogin(user, meta)
  }

  // ── Step 1: password ─────────────────────────────────────────────
  async beginLogin(
    email: string,
    password: string,
    meta: { ip: string; userAgent: string },
  ): Promise<LoginStageResult> {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase() },
      relations: { roles: { permissions: true } },
    })
    // Constant-time-ish failure message so we don't leak which emails exist
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    // If 2FA is OFF on this user, jump straight to issuing the token.
    if (!user.twoFactorEnabled) {
      const result = await this.completeLogin(user, meta)
      return { stage: 'done', result }
    }

    // Otherwise create a login_attempt row and mail the OTP
    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')
    const otpHash = await bcrypt.hash(otp, 10)

    const attempt = await this.attempts.save(this.attempts.create({
      userId:    user.id,
      otpHash,
      stage:     'otp',
      attempts:  0,
      expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000),
      ip:        meta.ip.slice(0, 64),
      userAgent: meta.userAgent.slice(0, 255),
    }))

    await this.mailer.send(
      user.email,
      'Together — your sign-in code',
      `Your verification code is: ${otp}\nIt expires in 10 minutes.`,
    )

    // In dev mode we echo the OTP back so the test/curl/jmeter flow
    // doesn't need access to an inbox. Removed in prod by env flag.
    const devOtp = this.mailer.isDev() ? otp : undefined

    return { stage: 'otp', attemptId: attempt.id, expiresIn: OTP_TTL_SEC, devOtp }
  }

  // ── Step 2: OTP ──────────────────────────────────────────────────
  async verifyOtp(
    attemptId: string,
    code: string,
    meta: { ip: string; userAgent: string },
  ): Promise<LoginStageResult> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } })
    if (!attempt) throw new BadRequestException('Login attempt expired — start again')
    if (attempt.stage === 'done') throw new BadRequestException('Already completed')
    if (attempt.expiresAt.getTime() < Date.now()) {
      await this.attempts.delete(attempt.id)
      throw new BadRequestException('Login attempt expired — start again')
    }
    if (attempt.attempts >= MAX_OTP_ATTEMPTS) {
      await this.attempts.delete(attempt.id)
      throw new UnauthorizedException('Too many wrong codes — start again')
    }
    if (attempt.stage !== 'otp') throw new BadRequestException('Wrong stage')

    const ok = await bcrypt.compare(code, attempt.otpHash)
    if (!ok) {
      attempt.attempts++
      await this.attempts.save(attempt)
      throw new UnauthorizedException('Invalid code')
    }

    const user = await this.users.findOne({
      where: { id: attempt.userId },
      relations: { roles: { permissions: true } },
    })
    if (!user) throw new UnauthorizedException('User vanished')

    // If 3FA is OFF on this user, finish here.
    if (!user.threeFactorEnabled || !user.securityPinHash) {
      await this.attempts.delete(attempt.id)
      const result = await this.completeLogin(user, meta)
      return { stage: 'done', result }
    }

    attempt.stage = 'pin'
    await this.attempts.save(attempt)
    return { stage: 'pin', attemptId: attempt.id, expiresIn: OTP_TTL_SEC }
  }

  // ── Step 3: PIN ──────────────────────────────────────────────────
  async verifyPin(
    attemptId: string,
    pin: string,
    meta: { ip: string; userAgent: string },
  ): Promise<LoginResult> {
    const attempt = await this.attempts.findOne({ where: { id: attemptId } })
    if (!attempt || attempt.stage !== 'pin') throw new BadRequestException('Wrong stage')
    if (attempt.expiresAt.getTime() < Date.now()) {
      await this.attempts.delete(attempt.id)
      throw new BadRequestException('Login attempt expired — start again')
    }
    // SEC-06: enforce the same brute-force cap verifyOtp applies. Without this
    // the 4–6 digit PIN could be tried indefinitely inside the attempt window.
    if (attempt.attempts >= MAX_PIN_ATTEMPTS) {
      await this.attempts.delete(attempt.id)
      throw new UnauthorizedException('Too many wrong PINs — start again')
    }

    const user = await this.users.findOne({
      where: { id: attempt.userId },
      relations: { roles: { permissions: true } },
    })
    if (!user) throw new UnauthorizedException('User vanished')

    const ok = await bcrypt.compare(pin, user.securityPinHash)
    if (!ok) {
      attempt.attempts++
      await this.attempts.save(attempt)
      throw new UnauthorizedException('Invalid security PIN')
    }

    await this.attempts.delete(attempt.id)
    return this.completeLogin(user, meta)
  }

  // ── Shared finisher: create session + sign tokens ────────────────
  private async completeLogin(
    user: User,
    meta: { ip: string; userAgent: string },
  ): Promise<LoginResult> {
    const session = await this.sessions.save(this.sessions.create({
      userId:     user.id,
      userAgent:  meta.userAgent.slice(0, 255),
      ip:         meta.ip.slice(0, 64),
      lastSeenAt: new Date(),
      expiresAt:  new Date(Date.now() + this.sessionAbsoluteSec * 1000),
      revoked:    false,
    }))

    const roleNames = (user.roles ?? []).map(r => r.name)

    const accessToken  = this.jwtUtil.signAccess({
      sub: user.id, sid: session.id, roles: roleNames,
    })
    const refreshToken = this.jwtUtil.signRefresh({
      sub: user.id, sid: session.id,
    })

    return {
      user: this.toUserPayload(user),
      roles: roleNames,
      permissions: this.permissionsOf(user),
      accessToken, refreshToken,
      expiresIn: this.jwtUtil.accessTtl,
    }
  }

  // ── Refresh ──────────────────────────────────────────────────────
  async refresh(refreshToken: string): Promise<LoginResult> {
    let claims
    try { claims = this.jwtUtil.verifyRefresh(refreshToken) }
    catch { throw new UnauthorizedException('Refresh token invalid or expired') }

    const session = await this.sessions.findOne({ where: { id: claims.sid } })
    if (!session || session.revoked) throw new UnauthorizedException('Session revoked')
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired')
    }
    const now = Date.now()
    if (now - session.lastSeenAt.getTime() > this.idleTimeoutSec * 1000) {
      session.revoked = true
      await this.sessions.save(session)
      throw new UnauthorizedException('Logged out for inactivity')
    }

    const user = await this.users.findOne({
      where: { id: session.userId },
      relations: { roles: { permissions: true } },
    })
    if (!user) throw new UnauthorizedException('User vanished')

    session.lastSeenAt = new Date()
    await this.sessions.save(session)

    const roleNames = (user.roles ?? []).map(r => r.name)
    const accessToken = this.jwtUtil.signAccess({
      sub: user.id, sid: session.id, roles: roleNames,
    })
    return {
      user: this.toUserPayload(user),
      roles: roleNames,
      permissions: this.permissionsOf(user),
      accessToken,
      refreshToken,           // we don't rotate refresh tokens in Bronze
      expiresIn: this.jwtUtil.accessTtl,
    }
  }

  // ── Logout ───────────────────────────────────────────────────────
  async logout(sessionId: string): Promise<void> {
    await this.sessions.update({ id: sessionId }, { revoked: true })
  }

  // ── Helpers ──────────────────────────────────────────────────────
  toUserPayload(user: User): AuthUserPayload {
    return {
      id: user.id, email: user.email, name: user.name, coupleRole: user.coupleRole,
      avatarColor: user.avatarColor, initials: user.initials,
      twoFactorEnabled:  user.twoFactorEnabled,
      threeFactorEnabled:user.threeFactorEnabled,
    }
  }

  permissionsOf(user: User): string[] {
    return Array.from(new Set(
      (user.roles ?? []).flatMap(r => (r.permissions ?? []).map(p => p.name)),
    ))
  }

  get idleSec():     number { return this.idleTimeoutSec }
  get absoluteSec(): number { return this.sessionAbsoluteSec }
}