// Destination: together-backend/together-backend/src/tasks/tasks.controller.spec.ts
// REPLACE — service mocks now return Promises.
import { Test, TestingModule } from '@nestjs/testing'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Priority, TaskState } from './entities/task.entity'

const makeTask = () => ({
  id: 't-1', title: 'Test', description: '',
  assigneeId: 'u-1', createdById: 'u-1',
  priority: Priority.HIGH, state: TaskState.TODO, dueDate: null,
  createdAt: new Date(), updatedAt: new Date(),
})

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
    }).compile()

    controller = module.get(TasksController)
    service    = module.get(TasksService) as jest.Mocked<TasksService>
  })

  it('GET / delegates to findAll', async () => {
    const page = { items: [], total: 0, page: 1, perPage: 10, totalPages: 1 }
    service.findAll.mockResolvedValue(page)
    expect(await controller.findAll({ page: 1, perPage: 10 })).toBe(page)
  })

  it('POST / delegates to create', async () => {
    const t = makeTask()
    service.create.mockResolvedValue(t)
    const r = await controller.create({ title: 'Test', assigneeId: 'u-1', priority: Priority.HIGH })
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