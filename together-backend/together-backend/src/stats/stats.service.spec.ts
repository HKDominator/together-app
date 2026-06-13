// BUG-06: completionRate must exclude cancelled tasks from denominator;
//         topCommentedTasks must not do an N+1 findById per task.
import { StatsService } from './stats.service'
import { TaskState, Priority } from '../tasks/entities/task.entity'

const makeTasksRepo = (overrides: Record<string, unknown> = {}) => ({
  countByState:    jest.fn(async () => [
    { state: TaskState.DONE,      count: '5' },
    { state: TaskState.TODO,      count: '2' },
    { state: TaskState.CANCELLED, count: '3' },
  ]),
  countByPriority: jest.fn(async () => []),
  countByAssignee: jest.fn(async () => []),
  countOverdue:    jest.fn(async () => 0),
  count:           jest.fn(async () => 10),
  countSince:      jest.fn(async () => 0),
  // batch load — not individual findById
  findByIds:       jest.fn(async (ids: string[]) =>
    ids.map(id => ({ id, title: `Task ${id}`, state: TaskState.TODO })),
  ),
  findById:        jest.fn(async () => null),
  ...overrides,
})

const makeUsersService = () => ({ findAll: jest.fn(async () => []) })

const makeCommentsRepo = (top = [{ taskId: 't1', count: 3 }, { taskId: 't2', count: 1 }]) => ({
  topTasksByCommentCount: jest.fn(async () => top),
})

describe('StatsService (BUG-06)', () => {
  it('completionRate excludes cancelled tasks from the denominator', async () => {
    const service = new StatsService(
      makeTasksRepo() as any,
      makeUsersService() as any,
    )
    const stats = await service.compute()
    // total=10, cancelled=3, done=5 → rate = round(5/7*100) = 71
    expect(stats.completionRate).toBe(71)
  })

  it('topCommentedTasks does NOT call findById per task (no N+1)', async () => {
    const tasksRepo = makeTasksRepo()
    const service = new StatsService(
      tasksRepo as any,
      makeUsersService() as any,
      makeCommentsRepo() as any,
    )
    await service.compute()
    // findById must not be called — batch load via findByIds instead
    expect(tasksRepo.findById).not.toHaveBeenCalled()
    expect(tasksRepo.findByIds).toHaveBeenCalledWith(['t1', 't2'])
  })
})
