// Destination: together-backend/src/auth/jwt-util.service.ts
// Thin wrapper around jsonwebtoken. Issues access + refresh tokens
// with different TTLs and scopes (Silver §2.2).
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

export interface AccessTokenClaims {
  sub:   string          // user id
  sid:   string          // session id
  roles: string[]        // role names (admin / user)
  typ:   'access'
  iat?:  number
  exp?:  number
}

export interface RefreshTokenClaims {
  sub:  string
  sid:  string
  typ:  'refresh'
  iat?: number
  exp?: number
}

@Injectable()
export class JwtUtil {
  private readonly secret:        string
  private readonly accessTtlSec:  number
  private readonly refreshTtlSec: number

  constructor(cfg: ConfigService) {
    // Fail fast: never fall back to an in-repo secret. A missing or placeholder
    // JWT_SECRET would let anyone forge an admin token, so refuse to boot
    // instead of silently signing with a publicly-known key (SEC-03).
    const secret = cfg.get<string>('JWT_SECRET')
    if (!secret || secret === 'dev-only-secret-change-me') {
      throw new Error(
        'JWT_SECRET is not set (or is the in-repo placeholder). Set a strong, ' +
        'high-entropy JWT_SECRET before starting the server.',
      )
    }
    this.secret        = secret
    this.accessTtlSec  = Number(cfg.get('JWT_ACCESS_TTL_SEC',  '900'))   // 15 min
    this.refreshTtlSec = Number(cfg.get('JWT_REFRESH_TTL_SEC', '604800')) // 7 days
  }

  signAccess(claims: Omit<AccessTokenClaims, 'typ' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...claims, typ: 'access' }, this.secret, { expiresIn: this.accessTtlSec })
  }

  signRefresh(claims: Omit<RefreshTokenClaims, 'typ' | 'iat' | 'exp'>): string {
    return jwt.sign({ ...claims, typ: 'refresh' }, this.secret, { expiresIn: this.refreshTtlSec })
  }

  verifyAccess(token: string): AccessTokenClaims {
    const c = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as AccessTokenClaims
    if (c.typ !== 'access') throw new Error('Wrong token type')
    return c
  }

  verifyRefresh(token: string): RefreshTokenClaims {
    const c = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as RefreshTokenClaims
    if (c.typ !== 'refresh') throw new Error('Wrong token type')
    return c
  }

  get accessTtl():  number { return this.accessTtlSec }
  get refreshTtl(): number { return this.refreshTtlSec }
}