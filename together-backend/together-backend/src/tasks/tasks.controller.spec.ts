// Destination: together-backend/together-backend/src/tasks/tasks.controller.spec.ts
// REPLACE — override guards (AuthGuard deps aren't available in unit tests),
// and pass req.user for the identity-wire create() call.
import { Test, TestingModule } from '@nestjs/testing'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { Priority, TaskState } from './entities/task.entity'
import type { Request } from 'express'

const makeTask = () => ({
  id: 't-1', title: 'Test', description: '',
  assigneeId: 'u-1', createdById: 'u-1',
  priority: Priority.HIGH, state: TaskState.TODO, dueDate: null,
  createdAt: new Date(), updatedAt: new Date(),
})

const mockReq = (userId = 'u-1') =>
  ({ user: { id: userId } }) as unknown as Request & { user: { id: string } }

describe('TasksController', () => {
  let controller: TasksController
  let service:    jest.Mocked<TasksService>

  beforeEach(async () => {
    const mock = {
      findAll:  jest.fn(),
      findOne:  jest.fn(),
      create:   jest.fn(),
      update:   jest.fn(),
      setState: jest.fn(),
      remove:   jest.fn(),
    } as unknown as jest.Mocked<TasksService>

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers:   [{ provide: TasksService, useValue: mock }],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard).useValue({ canActivate: () => true })
      .compile()

    controller = module.get(TasksController)
    service    = module.get(TasksService) as jest.Mocked<TasksService>
  })

  it('GET / delegates to findAll', async () => {
    const page = { items: [], total: 0, page: 1, perPage: 10, totalPages: 1 }
    service.findAll.mockResolvedValue(page)
    expect(await controller.findAll({ page: 1, perPage: 10 })).toBe(page)
  })

  it('POST / passes caller id as creatorId (identity wire)', async () => {
    const t = makeTask()
    service.create.mockResolvedValue(t)
    const r = await controller.create(
      { title: 'Test', assigneeId: 'u-1', priority: Priority.HIGH },
      mockReq('caller-id'),
    )
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Test' }),
      'caller-id',
    )
    expect(r).toBe(t)
  })

  it('PATCH /:id/state unwraps newState from the DTO', async () => {
    const t = { ...makeTask(), state: TaskState.IN_PROGRESS }
    service.setState.mockResolvedValue(t)
    const r = await controller.setState('t-1', { newState: TaskState.IN_PROGRESS })
    expect(service.setState).toHaveBeenCalledWith('t-1', TaskState.IN_PROGRESS)
    expect(r).toBe(t)
  })

  it('DELETE /:id awaits the service', async () => {
    service.remove.mockResolvedValue()
    await expect(controller.remove('t-1')).resolves.toBeUndefined()
    expect(service.remove).toHaveBeenCalledWith('t-1')
  })
})
