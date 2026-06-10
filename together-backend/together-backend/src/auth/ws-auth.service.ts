// Destination: together-backend/together-backend/src/auth/ws-auth.service.ts
// Authenticates a socket.io handshake the same way AuthGuard authenticates an
// HTTP request: verify the access JWT (from the access cookie or a Bearer
// token in the socket auth payload), confirm the session is live, and return
// the full User. Gateways use this to derive identity server-side so a client
// can no longer spoof another partner via a payload senderId (SEC-04).
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { Socket } from 'socket.io'
import { User } from '../users/entities/user.entity'
import { Session } from './entities/session.entity'
import { JwtUtil } from './jwt-util.service'
import { ACCESS_COOKIE } from './guards/auth.guard'

@Injectable()
export class WsAuthService {
  constructor(
    @InjectRepository(User)    private readonly users:    Repository<User>,
    @InjectRepository(Session) private readonly sessions: Repository<Session>,
    private readonly jwtUtil: JwtUtil,
  ) {}

  async authenticate(client: Socket): Promise<User | null> {
    const token = this.extractToken(client)
    if (!token) return null

    let claims
    try { claims = this.jwtUtil.verifyAccess(token) }
    catch { return null }

    const session = await this.sessions.findOne({ where: { id: claims.sid } })
    if (!session || session.revoked) return null
    if (session.expiresAt.getTime() < Date.now()) return null

    const user = await this.users.findOne({
      where: { id: session.userId },
      relations: { roles: { permissions: true } },
    })
    return user ?? null
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake?.auth ?? {}
    if (typeof auth.token === 'string' && auth.token) {
      return auth.token.startsWith('Bearer ') ? auth.token.slice(7) : auth.token
    }
    const cookieHeader = client.handshake?.headers?.cookie
    if (!cookieHeader) return null
    for (const part of cookieHeader.split(';')) {
      const [name, ...rest] = part.trim().split('=')
      if (name === ACCESS_COOKIE) return decodeURIComponent(rest.join('='))
    }
    return null
  }
}
