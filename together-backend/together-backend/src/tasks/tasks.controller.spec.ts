import { Test, TestingModule } from '@nestjs/testing'
import { TasksController } from './tasks.controller'
import { TasksService } from './tasks.service'
import { Priority, TaskState } from './entities/task.entity'

// Minimal fake — we just assert the controller delegates to the service.
const makeTask = () => ({
  id:          't-1',
  title:       'Test',
  description: '',
  assigneeId:  'u1',
  createdById: 'u1',
  priority:    Priority.HIGH,
  state:       TaskState.TODO,
  dueDate:     null,
  createdAt:   new Date().toISOString(),
  updatedAt:   new Date().toISOString(),
})

describe('TasksController', () => {
  let controller: TasksController
  let service:    jest.Mocked<TasksService>

  beforeEach(async () => {
    const mock: Partial<jest.Mocked<TasksService>> = {
      findAll:  jest.fn(),
      findOne:  jest.fn(),
      create:   jest.fn(),
      update:   jest.fn(),
      setState: jest.fn(),
      remove:   jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers:   [{ provide: TasksService, useValue: mock }],
    }).compile()

    controller = module.get(TasksController)
    service    = module.get(TasksService) as jest.Mocked<TasksService>
  })

  it('GET / → delegates to findAll with the query DTO', () => {
    const page = { items: [], total: 0, page: 1, perPage: 10, totalPages: 1 }
    service.findAll.mockReturnValue(page)
    const res = controller.findAll({ page: 1, perPage: 10 })
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, perPage: 10 })
    expect(res).toBe(page)
  })

  it('GET /:id → delegates to findOne', () => {
    const t = makeTask()
    service.findOne.mockReturnValue(t)
    expect(controller.findOne('t-1')).toBe(t)
    expect(service.findOne).toHaveBeenCalledWith('t-1')
  })

  it('POST / → delegates to create', () => {
    const t = makeTask()
    service.create.mockReturnValue(t)
    const dto = { title: 'Test', assigneeId: 'u1', priority: Priority.HIGH }
    expect(controller.create(dto)).toBe(t)
    expect(service.create).toHaveBeenCalledWith(dto)
  })

  it('PATCH /:id → delegates to update', () => {
    const t = makeTask()
    service.update.mockReturnValue(t)
    expect(controller.update('t-1', { title: 'New' })).toBe(t)
    expect(service.update).toHaveBeenCalledWith('t-1', { title: 'New' })
  })

  it('PATCH /:id/state → unwraps newState from the DTO', () => {
    const t = { ...makeTask(), state: TaskState.IN_PROGRESS }
    service.setState.mockReturnValue(t)
    const res = controller.setState('t-1', { newState: TaskState.IN_PROGRESS })
    expect(service.setState).toHaveBeenCalledWith('t-1', TaskState.IN_PROGRESS)
    expect(res).toBe(t)
  })

  it('DELETE /:id → delegates to remove and returns void', () => {
    service.remove.mockReturnValue(undefined)
    expect(controller.remove('t-1')).toBeUndefined()
    expect(service.remove).toHaveBeenCalledWith('t-1')
  })
})
