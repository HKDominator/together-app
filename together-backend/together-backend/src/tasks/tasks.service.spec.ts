// Destination: together-backend/together-backend/src/tasks/tasks.service.spec.ts
// REPLACE the existing file.
import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { TasksService } from './tasks.service'
import { TasksRepository } from './tasks.repository'
import { UsersService } from '../users/users.service'
import { UsersRepository } from '../users/users.repository'
import { Priority, Task, TaskState } from './entities/task.entity'
import { CreateTaskDto } from './dto/create-task.dto'

const FUTURE = (() => {
  const d = new Date(); d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
})()

const makeDto = (over: Partial<CreateTaskDto> = {}): CreateTaskDto => ({
  title:      'A valid task',
  assigneeId: 'u-1',
  priority:   Priority.MEDIUM,
  ...over,
})

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: 't-1', title: 'A valid task', description: '',
  assigneeId: 'u-1', createdById: 'u-1',
  priority: Priority.MEDIUM, state: TaskState.TODO, dueDate: null,
  createdAt: new Date(), updatedAt: new Date(),
  ...over,
})

describe('TasksService (unit, mocked repos)', () => {
  let service: TasksService
  let repo:    jest.Mocked<TasksRepository>
  let users:   jest.Mocked<UsersService>
  let usersR:  jest.Mocked<UsersRepository>

  beforeEach(async () => {
    const repoMock = {
      findAll:        jest.fn(),
      findFiltered:   jest.fn(),
      findById:       jest.fn(),
      insert:         jest.fn(),
      update:         jest.fn(),
      remove:         jest.fn(),
      clear:          jest.fn(),
      count:          jest.fn(),
    } as unknown as jest.Mocked<TasksRepository>

    const usersMock = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      exists:  jest.fn(),
    } as unknown as jest.Mocked<UsersService>

    const usersRepoMock = {
      findAll:     jest.fn().mockResolvedValue([
        { id: 'u-1', name: 'Ana', role: 'owner',   email: 'a@x', passwordHash: '', avatarColor: '#000', initials: 'A', createdAt: new Date() },
        { id: 'u-2', name: 'Dan', role: 'partner', email: 'd@x', passwordHash: '', avatarColor: '#000', initials: 'D', createdAt: new Date() },
      ]),
      findById:    jest.fn(),
      findByEmail: jest.fn(),
      exists:      jest.fn(),
      insert:      jest.fn(),
    } as unknown as jest.Mocked<UsersRepository>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: TasksRepository, useValue: repoMock },
        { provide: UsersService,    useValue: usersMock },
        { provide: UsersRepository, useValue: usersRepoMock },
      ],
    }).compile()

    service = module.get(TasksService)
    repo    = module.get(TasksRepository) as jest.Mocked<TasksRepository>
    users   = module.get(UsersService)    as jest.Mocked<UsersService>
    usersR  = module.get(UsersRepository) as jest.Mocked<UsersRepository>
  })

  // ── create ────────────────────────────────────────────────────
  describe('create()', () => {
    beforeEach(() => {
      users.exists.mockResolvedValue(true)
      repo.insert.mockImplementation(async (d) => makeTask(d as Partial<Task>))
    })

    it('rejects an unknown assignee', async () => {
      users.exists.mockResolvedValue(false)
      await expect(service.create(makeDto({ assigneeId: 'ghost' }), 'u-1'))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects a past due date', async () => {
      await expect(service.create(makeDto({ dueDate: '2000-01-01' }), 'u-1'))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('accepts a future due date', async () => {
      const t = await service.create(makeDto({ dueDate: FUTURE }), 'u-1')
      expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({ dueDate: FUTURE }))
      expect(t.dueDate).toBe(FUTURE)
    })

    it('trims title and description', async () => {
      await service.create(makeDto({ title: '  padded  ', description: '  note  ' }), 'u-1')
      expect(repo.insert).toHaveBeenCalledWith(expect.objectContaining({
        title: 'padded', description: 'note',
      }))
    })

    // ── BUG-02 / identity wire ─────────────────────────────────────
    // create() must record the caller's id as createdById — not the
    // first 'owner' from resolveDefaultCreator().
    it('uses the caller id as createdById, not the first owner', async () => {
      await service.create(makeDto(), 'caller-uuid')
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: 'caller-uuid' }),
      )
    })

    it('existing tests still pass when creatorId matches the old default', async () => {
      await service.create(makeDto(), 'u-1')
      expect(repo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ createdById: 'u-1' }),
      )
    })
  })

  // ── findAll ───────────────────────────────────────────────────
  describe('findAll()', () => {
    it('forwards filters and computes totalPages', async () => {
      repo.findFiltered.mockResolvedValue([[makeTask()], 25])
      const r = await service.findAll({ page: 2, perPage: 10, priority: Priority.HIGH })
      expect(repo.findFiltered).toHaveBeenCalledWith(
        expect.objectContaining({ priority: Priority.HIGH }), 2, 10,
      )
      expect(r.totalPages).toBe(3)
    })
  })

  // ── findOne ───────────────────────────────────────────────────
  describe('findOne()', () => {
    it('throws NotFound for a missing id', async () => {
      repo.findById.mockResolvedValue(null)
      await expect(service.findOne('nope')).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  // ── update ────────────────────────────────────────────────────
  describe('update()', () => {
    it('rejects an unknown assignee', async () => {
      repo.findById.mockResolvedValue(makeTask())
      users.exists.mockResolvedValue(false)
      await expect(service.update('t-1', { assigneeId: 'ghost' }))
        .rejects.toBeInstanceOf(BadRequestException)
    })
  })

  // ── setState (state machine) ──────────────────────────────────
  describe('setState()', () => {
    it('allows todo → in_progress', async () => {
      repo.findById.mockResolvedValue(makeTask({ state: TaskState.TODO }))
      repo.update.mockResolvedValue(makeTask({ state: TaskState.IN_PROGRESS }))
      const r = await service.setState('t-1', TaskState.IN_PROGRESS)
      expect(r.state).toBe(TaskState.IN_PROGRESS)
    })

    it('rejects todo → done (must go via in_progress)', async () => {
      repo.findById.mockResolvedValue(makeTask({ state: TaskState.TODO }))
      await expect(service.setState('t-1', TaskState.DONE))
        .rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects any transition out of done', async () => {
      repo.findById.mockResolvedValue(makeTask({ state: TaskState.DONE }))
      await expect(service.setState('t-1', TaskState.TODO))
        .rejects.toBeInstanceOf(BadRequestException)
    })
  })

  // ── remove ────────────────────────────────────────────────────
  describe('remove()', () => {
    it('throws NotFound when nothing was deleted', async () => {
      repo.remove.mockResolvedValue(false)
      await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('returns void on success', async () => {
      repo.remove.mockResolvedValue(true)
      await expect(service.remove('t-1')).resolves.toBeUndefined()
    })
  })
})