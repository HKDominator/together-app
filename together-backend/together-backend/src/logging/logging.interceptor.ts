// Destination: together-backend/together-backend/src/logs/logging.interceptor.ts
// Records every request to action_logs AFTER it completes. Has access
// to req.user (populated by AuthGuard on guarded routes), so logged-in
// users get a userId; anonymous requests get null.
//
// Fire-and-forget on insert — we never want logging to slow the API.
import {
  CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor,
} from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { LogsService } from './logs.service'
import { AnomalyDetectorService } from './anomaly-detector.service'
import type { User } from '../users/entities/user.entity'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger(LoggingInterceptor.name)

  constructor(
    private readonly logs:     LogsService,
    private readonly detector: AnomalyDetectorService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = ctx.switchToHttp()
    const req = httpCtx.getRequest()
    const res = httpCtx.getResponse()
    const start = Date.now()

    return next.handle().pipe(
      tap({
        next:  () => this.record(req, res, start, false),
        error: () => this.record(req, res, start, true),
      }),
    )
  }

  private record(req: any, res: any, start: number, errored: boolean) {
    const user: User | undefined = req.user
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
    // Fire and forget — never block the response on logging.
    this.logs.insert(draft).then(saved => {
      if (saved.userId) void this.detector.check(saved)
    }).catch(err => this.log.warn(`log insert failed: ${err.message}`))
  }
}