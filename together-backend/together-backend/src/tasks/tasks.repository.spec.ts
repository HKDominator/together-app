// Destination: together-backend/together-backend/src/tasks/tasks.repository.spec.ts
// NEW. Verifies the wrapper translates correctly to TypeORM Repository
// calls — no DB needed.
import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ObjectLiteral, Repository } from 'typeorm'
import { TasksRepository } from './tasks.repository'
import { Task, Priority, TaskState } from './entities/task.entity'

type MockRepo<T extends ObjectLiteral = any> = Partial<Record<keyof Repository<T>, jest.Mock>> & {
  createQueryBuilder: jest.Mock
}

const makeMockRepo = (): MockRepo => ({
  find:           jest.fn(),
  findOne:        jest.fn(),
  findAndCount:   jest.fn(),
  create:         jest.fn(x => x),
  save:           jest.fn(x => Promise.resolve({ ...(x as object), id: 'generated-id' })),
  update:         jest.fn(),
  delete:         jest.fn(),
  count:          jest.fn(),
  query:          jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    select:    jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where:     jest.fn().mockReturnThis(),
    andWhere:  jest.fn().mockReturnThis(),
    groupBy:   jest.fn().mockReturnThis(),
    orderBy:   jest.fn().mockReturnThis(),
    limit:     jest.fn().mockReturnThis(),
    skip:      jest.fn().mockReturnThis(),
    take:      jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
    getCount:   jest.fn(),
  })),
})

describe('TasksRepository (unit)', () => {
  let wrapper: TasksRepository
  let mock:    MockRepo

  beforeEach(async () => {
    mock = makeMockRepo()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksRepository,
        { provide: getRepositoryToken(Task), useValue: mock },
      ],
    }).compile()
    wrapper = module.get(TasksRepository)
  })

  it('findAll() orders by createdAt DESC', async () => {
    mock.find!.mockResolvedValue([])
    await wrapper.findAll()
    expect(mock.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } })
  })

  it('findFiltered() pushes filters into a where clause and paginates', async () => {
    mock.findAndCount!.mockResolvedValue([[], 0])
    await wrapper.findFiltered(
      { state: TaskState.DONE, priority: Priority.HIGH, assigneeId: 'u-1' },
      2, 10,
    )
    expect(mock.findAndCount).toHaveBeenCalledWith(expect.objectContaining({
      where: { state: TaskState.DONE, priority: Priority.HIGH, assigneeId: 'u-1' },
      skip: 10, take: 10,
    }))
  })

  it('insert() creates and saves', async () => {
    await wrapper.insert({ title: 'x', priority: Priority.HIGH, assigneeId: 'u-1', createdById: 'u-1' })
    expect(mock.create).toHaveBeenCalled()
    expect(mock.save).toHaveBeenCalled()
  })

  it('remove() returns true when affected > 0', async () => {
    mock.delete!.mockResolvedValue({ affected: 1 })
    expect(await wrapper.remove('id')).toBe(true)
  })

  it('remove() returns false when affected = 0', async () => {
    mock.delete!.mockResolvedValue({ affected: 0 })
    expect(await wrapper.remove('id')).toBe(false)
  })

  it('getUserTaskStats() invokes the SP via raw SQL', async () => {
    mock.query!.mockResolvedValue([{
      total_tasks: '5', done_tasks: '2', in_progress_tasks: '1',
      todo_tasks: '2', cancelled_tasks: '0', overdue_tasks: '1',
    }])
    const r = await wrapper.getUserTaskStats('u-1')
    expect(mock.query).toHaveBeenCalledWith(
      'SELECT * FROM get_user_task_stats($1)', ['u-1'],
    )
    expect(r).toEqual({
      total: 5, done: 2, inProgress: 1, todo: 2, cancelled: 0, overdue: 1,
    })
  })
})