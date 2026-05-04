// Destination: together-backend/together-backend/src/auth/decorators/current-user.decorator.ts
// Pulls the authenticated user out of the request — populated by AuthGuard.
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { User } from '../../users/entities/user.entity'

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User | undefined => {
    const req = ctx.switchToHttp().getRequest()
    return req.user as User | undefined
  },
)