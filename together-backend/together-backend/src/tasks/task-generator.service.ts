// Destination: together-backend/together-backend/src/tasks/task-generator.service.ts
// Make the timer callback async so we can await create().
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { TasksService } from './tasks.service'
import { UsersService } from '../users/users.service'
import { Priority } from './entities/task.entity'
import { CreateTaskDto } from './dto/create-task.dto'
import { TasksGateway } from './tasks.gateway'

@Injectable()
export class TaskGeneratorService implements OnModuleDestroy {
  private readonly log = new Logger(TaskGeneratorService.name)
  private timer: NodeJS.Timeout | null = null
  private running = false
  private readonly INTERVAL_MS   = 3000
  private readonly MIN_PER_BATCH = 1
  private readonly MAX_PER_BATCH = 2

  constructor(
    private readonly tasks:   TasksService,
    private readonly users:   UsersService,
    private readonly gateway: TasksGateway,
  ) {}

  start() {
    if (this.running) return { running: true as const }
    this.running = true
    this.timer = setInterval(() => { void this.generateBatch() }, this.INTERVAL_MS)
    this.gateway.emitGeneratorStarted()
    return { running: true as const }
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.running = false
    this.gateway.emitGeneratorStopped()
    return { running: false as const }
  }

  status() { return { running: this.running } }

  onModuleDestroy() { if (this.timer) clearInterval(this.timer) }

  private async generateBatch() {
    const count = faker.number.int({ min: this.MIN_PER_BATCH, max: this.MAX_PER_BATCH })
    const allUsers = await this.users.findAll()
    for (let i = 0; i < count; i++) {
      try {
        const dto = await this.makeFakeTaskDto(allUsers)
        const creator = allUsers[Math.floor(Math.random() * allUsers.length)]
        await this.tasks.create(dto, creator.id)
      } catch (err) {
        this.log.warn(`generator skipped one: ${(err as Error).message}`)
      }
    }
  }

  private async makeFakeTaskDto(allUsers?: Awaited<ReturnType<UsersService['findAll']>>): Promise<CreateTaskDto> {
    const users   = allUsers ?? await this.users.findAll()
    const assignee = users[Math.floor(Math.random() * users.length)]
    return {
      title:       faker.lorem.sentence({ min: 3, max: 7 }).slice(0, 99),
      description: faker.lorem.paragraph({ min: 1, max: 2 }).slice(0, 499),
      assigneeId:  assignee.id,
      priority:    faker.helpers.arrayElement([Priority.HIGH, Priority.MEDIUM, Priority.LOW]),
      dueDate:     null,
    }
  }
}