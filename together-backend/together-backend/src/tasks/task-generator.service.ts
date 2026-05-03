import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { faker } from '@faker-js/faker'
import { TasksService } from './tasks.service'
import { UsersService } from '../users/users.service'
import { Priority } from './entities/task.entity'
import { CreateTaskDto } from './dto/create-task.dto'
import { TasksGateway } from './tasks.gateway'

/**
 * Runs a setInterval loop that produces valid fake tasks and pushes
 * them through TasksService (so they're validated, persisted, AND
 * broadcast via the gateway — the frontend receives them as normal
 * `task:created` events, no special path needed).
 *
 * Silver A2 requirement:
 *   "an endpoint that starts (and one that stops) an asynchronous loop
 *    which programmatically generates fake but valid entities"
 */
@Injectable()
export class TaskGeneratorService implements OnModuleDestroy {
  private readonly log = new Logger(TaskGeneratorService.name)

  private timer: NodeJS.Timeout | null = null
  private running = false

  // Tunables — kept small for demo purposes. Interval < 1s would
  // overwhelm the UI; batch > 3 floods the table between renders.
  private readonly INTERVAL_MS   = 3000
  private readonly MIN_PER_BATCH = 1
  private readonly MAX_PER_BATCH = 2

  constructor(
    private readonly tasks:   TasksService,
    private readonly users:   UsersService,
    private readonly gateway: TasksGateway,
  ) {}

  start(): { running: true } {
    if (this.running) return { running: true }
    this.running = true
    this.timer   = setInterval(() => this.generateBatch(), this.INTERVAL_MS)
    this.gateway.emitGeneratorStarted()
    this.log.log('generator started')
    return { running: true }
  }

  stop(): { running: false } {
    if (this.timer) clearInterval(this.timer)
    this.timer   = null
    this.running = false
    this.gateway.emitGeneratorStopped()
    this.log.log('generator stopped')
    return { running: false }
  }

  status(): { running: boolean } {
    return { running: this.running }
  }

  // Clean up if the module is destroyed (e.g. HMR reload in dev).
  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer)
  }

  // ─────────────────────────────────────────────────────────────
  // Private
  // ─────────────────────────────────────────────────────────────
  private generateBatch(): void {
    const count = faker.number.int({ min: this.MIN_PER_BATCH, max: this.MAX_PER_BATCH })
    for (let i = 0; i < count; i++) {
      try {
        this.tasks.create(this.makeFakeTaskDto())
      } catch (err) {
        // A generator failure must never crash the server — log and move on.
        this.log.warn(`skipped a generated task: ${(err as Error).message}`)
      }
    }
  }

  private makeFakeTaskDto(): CreateTaskDto {
    const userIds = this.users.findAll().map(u => u.id)

    return {
      title:       this.pickTitle(),
      description: faker.lorem.sentence({ min: 6, max: 14 }),
      assigneeId:  faker.helpers.arrayElement(userIds),
      priority:    faker.helpers.arrayElement([Priority.HIGH, Priority.MEDIUM, Priority.LOW]),
      dueDate:     this.futureDate(),
    }
  }

  /**
   * Curated titles so generated tasks feel couple-planner-native
   * rather than Lorem-Ipsum noise. Pure faker.lorem would produce
   * things like "Quasi ullam velit" which look wrong in the UI.
   */
  private pickTitle(): string {
    const templates = [
      'Book {venue} for {occasion}',
      'Renew {thing}',
      'Plan {destination} trip itinerary',
      'Buy {item} for {person}',
      'Schedule dentist appointment',
      'Weekly grocery run',
      'Pick up {item} from the dry cleaner',
      'Call {person} about {topic}',
      'Research {product} options',
      'Pay {bill} before deadline',
      'Organise {room} closet',
      'Print {doc} for {person}',
    ]
    const template = faker.helpers.arrayElement(templates)

    return template
      .replace('{venue}',       faker.helpers.arrayElement(['Maison', 'Grano', 'the Italian place', 'the rooftop bar']))
      .replace('{occasion}',    faker.helpers.arrayElement(['anniversary', 'birthday', 'Valentine\'s', 'our reservation']))
      .replace('{thing}',       faker.helpers.arrayElement(['car insurance', 'gym membership', 'passport', 'Netflix']))
      .replace('{destination}', faker.helpers.arrayElement(['Lisbon', 'Vienna', 'Cluj', 'Thessaloniki', 'Budapest']))
      .replace('{item}',        faker.helpers.arrayElement(['flowers', 'the gift', 'groceries', 'the cake', 'shampoo']))
      .replace('{person}',      faker.helpers.arrayElement(['Mum', 'Dad', 'Irina', 'the landlord']))
      .replace('{topic}',       faker.helpers.arrayElement(['the trip', 'dinner plans', 'the lease', 'the bill']))
      .replace('{product}',     faker.helpers.arrayElement(['sofa', 'coffee machine', 'air fryer', 'kitchen knife']))
      .replace('{bill}',        faker.helpers.arrayElement(['the internet bill', 'the electricity bill', 'rent']))
      .replace('{room}',        faker.helpers.arrayElement(['bedroom', 'hallway', 'living room', 'kitchen']))
      .replace('{doc}',         faker.helpers.arrayElement(['the tax form', 'the rental contract', 'the invoice']))
  }

  /** A due date between today and ~60 days in the future, as YYYY-MM-DD. */
  private futureDate(): string {
    const days = faker.number.int({ min: 1, max: 60 })
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  }
}
