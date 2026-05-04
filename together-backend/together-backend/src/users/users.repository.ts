// Destination: together-backend/together-backend/src/users/users.repository.ts
// NEW — UsersService used to inline a hardcoded array. Now there's a
// real repo so we can seed and query users by email (Silver needs that
// for login).
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { name: 'ASC' } })
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } })
  }

  async exists(id: string): Promise<boolean> {
    const n = await this.repo.count({ where: { id } })
    return n > 0
  }

  insert(draft: Partial<User>): Promise<User> {
    return this.repo.save(this.repo.create(draft))
  }

  async clear(): Promise<void> {
    // For tests. CASCADE so child rows go too.
    await this.repo.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE')
  }

  count(): Promise<number> {
    return this.repo.count()
  }
}