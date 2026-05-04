// Destination: together-backend/together-backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../users/entities/user.entity'

export interface LoginResult {
  user: {
    id: string; email: string; name: string; role: string
    avatarColor: string; initials: string
  }
  roles:       string[]
  permissions: string[]
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async login(email: string, password: string): Promise<{ user: User; result: LoginResult }> {
    const user = await this.users.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    })
    if (!user) throw new UnauthorizedException('Invalid credentials')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok)  throw new UnauthorizedException('Invalid credentials')

    return { user, result: this.toResult(user) }
  }

  toResult(user: User): LoginResult {
    return {
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        avatarColor: user.avatarColor, initials: user.initials,
      },
      roles:       (user.roles ?? []).map(r => r.name),
      permissions: Array.from(new Set(
        (user.roles ?? []).flatMap(r => (r.permissions ?? []).map(p => p.name)),
      )),
    }
  }
}