// Destination: together-backend/together-backend/src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findAll(): Promise<User[]> {
    return this.repo.findAll()
  }

  async findOne(id: string): Promise<User> {
    const u = await this.repo.findById(id)
    if (!u) throw new NotFoundException(`User ${id} not found`)
    return u
  }

  exists(id: string): Promise<boolean> {
    return this.repo.exists(id)
  }
}