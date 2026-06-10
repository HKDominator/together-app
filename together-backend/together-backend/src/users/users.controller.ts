import { Controller, Get, Param, UseGuards } from '@nestjs/common'
import { UsersService } from './users.service'
import { AuthGuard } from '../auth/guards/auth.guard'

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  findAll() {
    return this.users.findAll()
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id)
  }
}
