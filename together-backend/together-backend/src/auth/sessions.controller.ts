// Destination: together-backend/src/auth/sessions.controller.ts
import {
  Controller, Delete, Get, Param, Post, Req, UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { AuthGuard } from './guards/auth.guard'
import { SessionsService } from './sessions.service'
import type { Session } from './entities/session.entity'
import type { User } from '../users/entities/user.entity'

interface AuthedRequest extends Request {
  user: User
  session: Session
}

@Controller('auth/sessions')
@UseGuards(AuthGuard)
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  // List every active session for the current user (for the UI)
  @Get()
  list(@Req() req: AuthedRequest) {
    return this.sessions.listFor(req.user.id).then(rows =>
      rows.map(s => ({
        id: s.id, ip: s.ip, userAgent: s.userAgent,
        createdAt: s.createdAt, lastSeenAt: s.lastSeenAt,
        isCurrent: s.id === req.session.id,
      })),
    )
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.sessions.revoke(req.user.id, id)
  }

  // "Sign out everywhere else" button
  @Post('revoke-others')
  revokeOthers(@Req() req: AuthedRequest) {
    return this.sessions.revokeAllExceptCurrent(req.user.id, req.session.id)
  }
}