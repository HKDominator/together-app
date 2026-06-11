// BUG-11: admin user-delete must return 409 Conflict (not raw 500) when the
// user is still referenced by tasks or comments (FK RESTRICT violation).
import { ConflictException, NotFoundException } from '@nestjs/common'
import { AdminUsersController } from './admin-users.controller'

const makeRepo = () => ({
  find:   jest.fn(async () => []),
  delete: jest.fn(),
})

const makeController = (repo: ReturnType<typeof makeRepo>) =>
  new AdminUsersController(repo as any)

describe('AdminUsersController — remove() (BUG-11)', () => {
  it('returns { ok: true } when the user has no FK references', async () => {
    const repo = makeRepo()
    repo.delete.mockResolvedValue({ affected: 1 })
    const ctrl = makeController(repo)
    await expect(ctrl.remove('u-1')).resolves.toEqual({ ok: true })
  })

  it('throws NotFoundException when the user does not exist', async () => {
    const repo = makeRepo()
    repo.delete.mockResolvedValue({ affected: 0 })
    const ctrl = makeController(repo)
    await expect(ctrl.remove('ghost')).rejects.toBeInstanceOf(NotFoundException)
  })

  it('throws ConflictException (409) when FK constraint blocks deletion', async () => {
    const repo = makeRepo()
    const fkError = Object.assign(new Error('FK violation'), { code: '23503' })
    repo.delete.mockRejectedValue(fkError)
    const ctrl = makeController(repo)
    await expect(ctrl.remove('u-1')).rejects.toBeInstanceOf(ConflictException)
  })
})
