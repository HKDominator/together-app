// Destination: together-backend/together-backend/src/logging/logging.interceptor.ts
// FIXED — root cause of the empty observation list:
//
//   `req.user` is ONLY set by AuthGuard. Routes like GET /api/tasks have
//   no @UseGuards(AuthGuard), so even though Dan is logged in and the
//   cookie is sent, req.user stays undefined and every log row got
//   userId=null. The detector then early-returns at `if (!latest.userId)`
//   and nothing ever gets flagged.
//
// Fix: when req.user is missing, fall back to reading the session
// cookie directly and looking the user up. We still log every request,
// but now logged-in users are recognised across ALL routes — guarded
// or not — which is exactly what burst/abuse detection requires.
import {
  CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Observable, tap } from 'rxjs'
import { LogsService } from './logs.service'
import { AnomalyDetectorService } from './anomaly-detector.service'
import { User } from '../users/entities/user.entity'
import { SESSION_COOKIE } from '../auth/guards/auth.guard'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger(LoggingInterceptor.name)

  constructor(
    private readonly logs:     LogsService,
    private readonly detector: AnomalyDetectorService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = ctx.switchToHttp()
    const req = httpCtx.getRequest()
    const res = httpCtx.getResponse()
    const start = Date.now()

    return next.handle().pipe(
      tap({
        next:  () => void this.record(req, res, start, false),
        error: () => void this.record(req, res, start, true),
      }),
    )
  }

  private async record(req: any, res: any, start: number, errored: boolean) {
    try {
      // Prefer the user already attached by AuthGuard; otherwise,
      // resolve from the session cookie ourselves so unguarded routes
      // (like GET /api/tasks) still produce attributable log rows.
      let user: User | undefined = req.user
      if (!user) {
        const sid = req.cookies?.[SESSION_COOKIE]
        if (sid && typeof sid === 'string') {
          user = await this.users.findOne({
            where: { id: sid },
            relations: { roles: true },
          }) ?? undefined
        }
      }

      const action = `${req.method} ${req.route?.path ?? req.url ?? ''}`.slice(0, 100)
      const draft = {
        userId:     user?.id ?? null,
        userRole:   user ? ((user.roles ?? []).map(r => r.name).join(',') || 'user') : '',
        action,
        method:     req.method,
        path:       (req.url ?? '').slice(0, 255),
        statusCode: errored ? (res.statusCode || 500) : res.statusCode,
        durationMs: Date.now() - start,
        ip:         (req.ip ?? req.socket?.remoteAddress ?? '').slice(0, 64),
        metadata:   null,
      }

      const saved = await this.logs.insert(draft)
      if (saved.userId) await this.detector.check(saved)
    } catch (err) {
      this.log.warn(`log insert failed: ${(err as Error).message}`)
    }
  }
}