// Destination: together-backend/together-backend/src/logging/logging.interceptor.ts
//
// ROOT-CAUSE FIX — why vandal + probe were never detected:
//
//   NestJS lifecycle order:
//     5. Controller guards  (AuthGuard, PermissionsGuard — these throw 403)
//     7. Global interceptors (APP_INTERCEPTOR — LoggingInterceptor)
//
//   Controller guards run BEFORE global interceptors.  If PermissionsGuard
//   throws a ForbiddenException (vandal DELETE 403, probe /admin/* 403),
//   the global interceptor's intercept() is NEVER invoked — those requests
//   were completely invisible to the detector.
//
//   Even for guard-passing routes where the handler throws (probe 404),
//   res.statusCode is still the Express default (200) when the RxJS
//   error-tap fires because exception filters run after interceptors.
//   So 404s were logged as 200 and ruleProbing never found any 4xx rows.
//
// Fix: switch from NestInterceptor to NestMiddleware.
//   Middleware runs at step 3 in the lifecycle — before every guard.
//   res.once('finish') fires after Express has written the response, so
//   res.statusCode is always the real HTTP status (403, 404, 201, …).
//   User is resolved by decoding the access-token JWT from the cookie
//   (since req.user is never set at middleware time).
import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LogsService } from './logs.service'
import { AnomalyDetectorService } from './anomaly-detector.service'
import { User } from '../users/entities/user.entity'
import { JwtUtil } from '../auth/jwt-util.service'
import { ACCESS_COOKIE } from '../auth/guards/auth.guard'

@Injectable()
export class LoggingInterceptor implements NestMiddleware {
  private readonly log = new Logger(LoggingInterceptor.name)

  constructor(
    private readonly logs:     LogsService,
    private readonly detector: AnomalyDetectorService,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwtUtil: JwtUtil,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now()

    // 'finish' fires after Express sends the full response — statusCode is
    // always correct here, whether it came from a guard, a handler, or
    // an exception filter. Unlike the old tap({error}) approach this fires
    // even when controller guards short-circuit the request.
    res.once('finish', () => {
      void this.record(req, res, start)
    })

    next()
  }

  private async record(req: Request, res: Response, start: number) {
    try {
      // Middleware runs before guards, so req.user is never populated here.
      // Decode the access-token JWT from the cookie instead.
      let user: User | undefined
      const token = (req as any).cookies?.[ACCESS_COOKIE]
      if (token && typeof token === 'string') {
        try {
          const claims = this.jwtUtil.verifyAccess(token)
          user = (await this.users.findOne({
            where:     { id: claims.sub },
            relations: { roles: true },
          })) ?? undefined
        } catch { /* expired / invalid token — treat request as anonymous */ }
      }

      const action = `${req.method} ${(req as any).route?.path ?? req.url ?? ''}`.slice(0, 100)
      const draft = {
        userId:     user?.id ?? null,
        userRole:   user ? ((user.roles ?? []).map(r => r.name).join(',') || 'user') : '',
        action,
        method:     req.method,
        path:       (req.url ?? '').slice(0, 255),
        statusCode: res.statusCode,          // always the real code post-finish
        durationMs: Date.now() - start,
        ip:         (req.ip ?? req.socket?.remoteAddress ?? '').slice(0, 64),
        metadata:   null,
      }

      const saved = await this.logs.insert(draft)
      if (saved.userId) await this.detector.observe(saved.userId)
    } catch (err) {
      this.log.warn(`log insert failed: ${(err as Error).message}`)
    }
  }
}
