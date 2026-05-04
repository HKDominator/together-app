// Destination: together-backend/together-backend/src/auth/decorators/require-permissions.decorator.ts
// Marks a route as gated behind one or more permissions.
// Usage: @RequirePermissions('user.manage')
import { SetMetadata } from '@nestjs/common'
export const PERMISSIONS_KEY = 'requiredPermissions'
export const RequirePermissions = (...perms: string[]) =>
  SetMetadata(PERMISSIONS_KEY, perms)