import { Injectable, NotFoundException } from '@nestjs/common'
import { User } from './entities/user.entity'

/**
 * Two-person workspace for a couple. Users are static — in a real
 * app this would be a database table tied to auth, but the Bronze
 * challenge forbids persistence, and the app's domain doesn't need
 * user mutation anyway.
 */
@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 'u1', name: 'Ana Pop',     role: 'owner',   avatarColor: '#C0392B', initials: 'AP' },
    { id: 'u2', name: 'Dan Ionescu', role: 'partner', avatarColor: '#2980B9', initials: 'DI' },
  ]

  findAll(): User[] {
    return [...this.users]  // defensive copy — don't let callers mutate
  }

  findOne(id: string): User {
    const user = this.users.find(u => u.id === id)
    if (!user) throw new NotFoundException(`User ${id} not found`)
    return user
  }

  /** True when the id matches a known user. Used by TasksService. */
  exists(id: string): boolean {
    return this.users.some(u => u.id === id)
  }
}
