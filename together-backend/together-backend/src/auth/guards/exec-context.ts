// Destination: together-backend/src/auth/guards/exec-context.ts
// Extracts the underlying request from any execution context — HTTP or
// GraphQL — so the same guards (AuthGuard, PermissionsGuard) protect REST
// controllers and GraphQL resolvers identically (SEC-01).
import { ExecutionContext } from '@nestjs/common'
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql'

export function getRequestFromContext(ctx: ExecutionContext): any {
  if (ctx.getType<GqlContextType>() === 'graphql') {
    return GqlExecutionContext.create(ctx).getContext().req
  }
  return ctx.switchToHttp().getRequest()
}
