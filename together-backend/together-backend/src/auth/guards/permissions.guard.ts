// Destination: together-backend/together-backend/src/auth/guards/permissions.guard.ts
// Runs AFTER AuthGuard. Checks that req.user has every permission listed
// in @RequirePermissions(...). Pulled directly from the DB-loaded
// roles → permissions graph.
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator'
import type { User } from '../../users/entities/user.entity'
import { getRequestFromContext } from './exec-context'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(), ctx.getClass(),
    ]) ?? []
    if (required.length === 0) return true   // route has no permission requirement

    const user: User | undefined = getRequestFromContext(ctx)?.user
    if (!user) throw new ForbiddenException('Not authenticated')

    const have = new Set(
      (user.roles ?? []).flatMap(r => (r.permissions ?? []).map(p => p.name)),
    )
    const missing = required.filter(p => !have.has(p))
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permission(s): ${missing.join(', ')}`)
    }
    return true
  }
}