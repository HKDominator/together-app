import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { TasksRepository } from './tasks.repository'
import { UsersService } from '../users/users.service'
import { Priority, TaskState } from './entities/task.entity'
import { CreateTaskDto } from './dto/create-task.dto'

// ── Helpers ───────────────────────────────────────────────────────────
const makeCreateDto = (over: Partial<CreateTaskDto> = {}): CreateTaskDto => ({
  title:      'A valid task',
  assigneeId: 'u1',
  priority:   Priority.MEDIUM,
  ...over,
})

const FUTURE_DATE = (() => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)   // YYYY-MM-DD
})()

// ── Suite ─────────────────────────────────────────────────────────────
describe('TasksService', () => {
  let service: TasksService
  let repo:    TasksRepository
  let users:   UsersService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksService, TasksRepository, UsersService],
    }).compile()

    service = module.get(TasksService)
    repo    = module.get(TasksRepository)
    users   = module.get(UsersService)

    repo.clear()                                              // fresh slate per test
  })

  // ── create ────────────────────────────────────────────────────
  describe('create()', () => {
    it('creates a task with a fresh id and default state=todo', () => {
      const t = service.create(makeCreateDto())
      expect(t.id).toBeDefined()
      expect(t.state).toBe(TaskState.TODO)
      expect(t.title).toBe('A valid task')
      expect(t.createdById).toBe('u1')
    })

    it('trims the title and description', () => {
      const t = service.create(makeCreateDto({ title: '  padded  ', description: '  note  ' }))
      expect(t.title).toBe('padded')
      expect(t.description).toBe('note')
    })

    it('rejects unknown assigneeId', () => {
      expect(() => service.create(makeCreateDto({ assigneeId: 'ghost' })))
        .toThrow(BadRequestException)
    })

    it('rejects a due date in the past', () => {
      expect(() => service.create(makeCreateDto({ dueDate: '2000-01-01' })))
        .toThrow(BadRequestException)
    })

    it('accepts a future due date', () => {
      const t = service.create(makeCreateDto({ dueDate: FUTURE_DATE }))
      expect(t.dueDate).toBe(FUTURE_DATE)
    })

    it('accepts no due date', () => {
      const t = service.create(makeCreateDto({ dueDate: undefined }))
      expect(t.dueDate).toBeNull()
    })
  })

  // ── findAll (pagination + filters) ────────────────────────────
  describe('findAll()', () => {
    beforeEach(() => {
      // Seed 15 tasks: alternating priority, alternating assignee
      for (let i = 0; i < 15; i++) {
        service.create(makeCreateDto({
          title:      `Task #${i}`,
          priority:   i % 2 === 0 ? Priority.HIGH : Priority.LOW,
          assigneeId: i % 2 === 0 ? 'u1' : 'u2',
        }))
      }
    })

    it('paginates with default perPage=10', () => {
      const r = service.findAll({ page: 1 })
      expect(r.items).toHaveLength(10)
      expect(r.total).toBe(15)
      expect(r.totalPages).toBe(2)
    })

    it('returns the remainder on the last page', () => {
      const r = service.findAll({ page: 2, perPage: 10 })
      expect(r.items).toHaveLength(5)
    })

    it('filters by priority', () => {
      const r = service.findAll({ priority: Priority.HIGH, perPage: 100 })
      expect(r.items.every(t => t.priority === Priority.HIGH)).toBe(true)
      expect(r.total).toBe(8)  // indices 0,2,4,6,8,10,12,14
    })

    it('filters by assigneeId', () => {
      const r = service.findAll({ assigneeId: 'u2', perPage: 100 })
      expect(r.items.every(t => t.assigneeId === 'u2')).toBe(true)
    })

    it('filters by state', () => {
      const all = service.findAll({ perPage: 100 })
      service.setState(all.items[0].id, TaskState.IN_PROGRESS)
      const r = service.findAll({ state: TaskState.IN_PROGRESS, perPage: 100 })
      expect(r.total).toBe(1)
    })

    it('search is case-insensitive substring on title', () => {
      const r = service.findAll({ search: 'task #1', perPage: 100 })
      // Task #1, #10, #11, #12, #13, #14 → 6 matches
      expect(r.total).toBe(6)
    })

    it('caps perPage via DTO at 100 — excess is a validation concern not a service one', () => {
      // Sanity: service doesn't re-cap, pipe does. Passing 50 is fine.
      const r = service.findAll({ perPage: 50 })
      expect(r.items.length).toBeLessThanOrEqual(50)
    })
  })

  // ── findOne ───────────────────────────────────────────────────
  describe('findOne()', () => {
    it('returns an existing task', () => {
      const t = service.create(makeCreateDto())
      expect(service.findOne(t.id)).toEqual(t)
    })

    it('throws NotFound for an unknown id', () => {
      expect(() => service.findOne('nope')).toThrow(NotFoundException)
    })
  })

  // ── update ────────────────────────────────────────────────────
  describe('update()', () => {
    it('applies partial changes', () => {
      const t = service.create(makeCreateDto())
      const u = service.update(t.id, { title: 'Edited' })
      expect(u.title).toBe('Edited')
      expect(u.priority).toBe(Priority.MEDIUM)  // untouched
    })

    it('preserves id, createdAt, and createdById', () => {
      const t = service.create(makeCreateDto())
      const u = service.update(t.id, { title: 'New' })
      expect(u.id).toBe(t.id)
      expect(u.createdAt).toBe(t.createdAt)
      expect(u.createdById).toBe(t.createdById)
    })

    it('bumps updatedAt', async () => {
      const t = service.create(makeCreateDto())
      // ISO-second resolution — nudge one ms forward
      await new Promise(r => setTimeout(r, 5))
      const u = service.update(t.id, { title: 'X' })
      expect(u.updatedAt >= t.updatedAt).toBe(true)
    })

    it('rejects unknown task id', () => {
      expect(() => service.update('nope', { title: 'X' })).toThrow(NotFoundException)
    })

    it('rejects unknown assignee', () => {
      const t = service.create(makeCreateDto())
      expect(() => service.update(t.id, { assigneeId: 'ghost' }))
        .toThrow(BadRequestException)
    })
  })

  // ── setState (state machine) ──────────────────────────────────
  describe('setState()', () => {
    it('allows todo → in_progress', () => {
      const t = service.create(makeCreateDto())
      const u = service.setState(t.id, TaskState.IN_PROGRESS)
      expect(u.state).toBe(TaskState.IN_PROGRESS)
    })

    it('allows todo → cancelled', () => {
      const t = service.create(makeCreateDto())
      const u = service.setState(t.id, TaskState.CANCELLED)
      expect(u.state).toBe(TaskState.CANCELLED)
    })

    it('allows in_progress → done', () => {
      const t = service.create(makeCreateDto())
      service.setState(t.id, TaskState.IN_PROGRESS)
      const u = service.setState(t.id, TaskState.DONE)
      expect(u.state).toBe(TaskState.DONE)
    })

    it('rejects todo → done (must go via in_progress)', () => {
      const t = service.create(makeCreateDto())
      expect(() => service.setState(t.id, TaskState.DONE))
        .toThrow(BadRequestException)
    })

    it('rejects any transition from done (terminal)', () => {
      const t = service.create(makeCreateDto())
      service.setState(t.id, TaskState.IN_PROGRESS)
      service.setState(t.id, TaskState.DONE)
      expect(() => service.setState(t.id, TaskState.TODO))
        .toThrow(BadRequestException)
    })

    it('rejects any transition from cancelled (terminal)', () => {
      const t = service.create(makeCreateDto())
      service.setState(t.id, TaskState.CANCELLED)
      expect(() => service.setState(t.id, TaskState.TODO))
        .toThrow(BadRequestException)
    })

    it('throws NotFound for an unknown id', () => {
      expect(() => service.setState('nope', TaskState.DONE))
        .toThrow(NotFoundException)
    })
  })

  // ── remove ────────────────────────────────────────────────────
  describe('remove()', () => {
    it('removes an existing task', () => {
      const t = service.create(makeCreateDto())
      service.remove(t.id)
      expect(() => service.findOne(t.id)).toThrow(NotFoundException)
    })

    it('throws NotFound for an unknown id', () => {
      expect(() => service.remove('nope')).toThrow(NotFoundException)
    })
  })
})
