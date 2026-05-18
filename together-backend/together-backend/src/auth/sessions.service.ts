// Destination: together-backend/src/auth/sessions.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not } from 'typeorm'
import { Session } from './entities/session.entity'

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
  ) {}

  listFor(userId: string) {
    return this.sessions.find({
      where: { userId, revoked: false },
      order: { lastSeenAt: 'DESC' },
    })
  }

  async revoke(userId: string, sessionId: string) {
    const s = await this.sessions.findOne({ where: { id: sessionId, userId } })
    if (!s) throw new NotFoundException('Session not found')
    s.revoked = true
    await this.sessions.save(s)
    return { ok: true }
  }

  async revokeAllExceptCurrent(userId: string, currentSessionId: string) {
    await this.sessions.update(
      { userId, id: Not(currentSessionId), revoked: false },
      { revoked: true },
    )
    return { ok: true }
  }
}