// Destination: together-backend/src/auth/guards/auth.guard.ts
// REPLACE — reads JWT from either cookie OR `Authorization: Bearer ...`
// (handy for curl / jmeter / postman). Verifies the JWT, looks up the
// session, enforces inactivity timeout, bumps lastSeenAt. Attaches the
// full User (with roles + permissions) to req.user just like before.
import {
  CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from '../../users/entities/user.entity'
import { Session } from '../entities/session.entity'
import { JwtUtil } from '../jwt-util.service'
import { ConfigService } from '@nestjs/config'
import { getRequestFromContext } from './exec-context'

export const SESSION_COOKIE = 'together_session'   // kept for backwards compat with tests
export const ACCESS_COOKIE  = 'together_access'
export const REFRESH_COOKIE = 'together_refresh'

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly log = new Logger(AuthGuard.name)
  private readonly idleSec: number

  constructor(
    @InjectRepository(User)    private readonly users:    Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly jwtUtil: JwtUtil,
    cfg: ConfigService,
  ) {
    this.idleSec = Number(cfg.get('IDLE_TIMEOUT_SEC', '900'))
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = getRequestFromContext(ctx)

    const token =
      req.cookies?.[ACCESS_COOKIE] ??
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined)
    if (!token) throw new UnauthorizedException('Not logged in')

    let claims
    try { claims = this.jwtUtil.verifyAccess(token) }
    catch { throw new UnauthorizedException('Token invalid or expired') }

    const session = await this.sessions.findOne({ where: { id: claims.sid } })
    if (!session)               throw new UnauthorizedException('Session not found')
    if (session.revoked)        throw new UnauthorizedException('Session revoked')
    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Session expired')
    }

    const now      = Date.now()
    const idleMs   = now - session.lastSeenAt.getTime()
    if (idleMs > this.idleSec * 1000) {
      session.revoked = true
      await this.sessions.save(session)
      throw new UnauthorizedException('Logged out for inactivity')
    }

    // Bump lastSeenAt (sliding window). Skip if very recent to keep
    // write traffic low under bursts.
    if (idleMs > 30_000) {
      session.lastSeenAt = new Date()
      await this.sessions.save(session)
    }

    const user = await this.users.findOne({
      where: { id: session.userId },
      relations: { roles: { permissions: true } },
    })
    if (!user) throw new UnauthorizedException('User vanished')

    req.user      = user
    req.session   = session
    return true
  }
}