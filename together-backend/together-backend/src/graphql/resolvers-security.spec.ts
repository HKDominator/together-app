// SEC-01: every GraphQL resolver must carry the same auth + RBAC wiring as
// its REST counterpart. These assert the security metadata is present so a
// resolver can never be exposed unauthenticated by accident.
import { TasksResolver } from './tasks.resolver'
import { CommentsResolver } from './comments.resolver'
import { StatsResolver, UsersResolver } from './misc.resolvers'
import { AuthGuard } from '../auth/guards/auth.guard'
import { PermissionsGuard } from '../auth/guards/permissions.guard'
import { PERMISSIONS_KEY } from '../auth/decorators/require-permissions.decorator'

const GUARDS_METADATA = '__guards__'
const classGuards = (c: any): any[] => Reflect.getMetadata(GUARDS_METADATA, c) ?? []
const methodPerms = (c: any, m: string): string[] | undefined =>
  Reflect.getMetadata(PERMISSIONS_KEY, c.prototype[m])

describe('TasksResolver is guarded like the REST tasks controller (SEC-01)', () => {
  it('applies AuthGuard + PermissionsGuard at the class level', () => {
    expect(classGuards(TasksResolver)).toEqual(
      expect.arrayContaining([AuthGuard, PermissionsGuard]),
    )
  })

  it('deleteTask requires task.delete (the privilege the user role lacks)', () => {
    expect(methodPerms(TasksResolver, 'deleteTask')).toEqual(['task.delete'])
  })

  it('mutations and queries require the matching task permission', () => {
    expect(methodPerms(TasksResolver, 'createTask')).toEqual(['task.create'])
    expect(methodPerms(TasksResolver, 'updateTask')).toEqual(['task.update'])
    expect(methodPerms(TasksResolver, 'setTaskState')).toEqual(['task.update'])
    expect(methodPerms(TasksResolver, 'listTasks')).toEqual(['task.read'])
    expect(methodPerms(TasksResolver, 'getTask')).toEqual(['task.read'])
  })
})

describe('CommentsResolver is guarded like the REST comments controller (SEC-01)', () => {
  it('applies AuthGuard + PermissionsGuard at the class level', () => {
    expect(classGuards(CommentsResolver)).toEqual(
      expect.arrayContaining([AuthGuard, PermissionsGuard]),
    )
  })

  it('comment mutations require the matching comment permission', () => {
    expect(methodPerms(CommentsResolver, 'list')).toEqual(['task.read'])
    expect(methodPerms(CommentsResolver, 'addComment')).toEqual(['comment.create'])
    expect(methodPerms(CommentsResolver, 'editComment')).toEqual(['comment.update'])
    expect(methodPerms(CommentsResolver, 'deleteComment')).toEqual(['comment.delete'])
  })
})

describe('Users + Stats resolvers require authentication (SEC-01)', () => {
  it('UsersResolver applies AuthGuard', () => {
    expect(classGuards(UsersResolver)).toEqual(expect.arrayContaining([AuthGuard]))
  })
  it('StatsResolver applies AuthGuard', () => {
    expect(classGuards(StatsResolver)).toEqual(expect.arrayContaining([AuthGuard]))
  })
})
