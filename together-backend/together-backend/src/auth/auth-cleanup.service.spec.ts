// BUG-13: sweepExpired() must delete expired rows from both
// login_attempts and password_resets tables.
import { AuthCleanupService } from './auth-cleanup.service'

const makeRepo = (affected = 0) => ({
  delete: jest.fn(async () => ({ affected })),
})

describe('AuthCleanupService — sweepExpired() (BUG-13)', () => {
  it('deletes expired login attempts and password resets', async () => {
    const attempts = makeRepo(3)
    const resets   = makeRepo(1)
    const svc = new AuthCleanupService(attempts as any, resets as any)

    const result = await svc.sweepExpired()

    expect(attempts.delete).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.anything() }),
    )
    expect(resets.delete).toHaveBeenCalledWith(
      expect.objectContaining({ expiresAt: expect.anything() }),
    )
    expect(result).toEqual({ attempts: 3, resets: 1 })
  })

  it('returns zero counts when nothing is expired', async () => {
    const svc = new AuthCleanupService(makeRepo(0) as any, makeRepo(0) as any)
    const result = await svc.sweepExpired()
    expect(result).toEqual({ attempts: 0, resets: 0 })
  })
})
