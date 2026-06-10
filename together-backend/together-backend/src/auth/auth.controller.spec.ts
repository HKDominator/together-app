// SEC-02: the lab-only /auth/dev/inbox endpoint must be hard-gated — when the
// mailer is not in dev mode the endpoint behaves as if it does not exist
// (404), so it can never become an OTP / reset-code oracle in production.
import { NotFoundException } from '@nestjs/common'
import type { Request } from 'express'
import { AuthController } from './auth.controller'

const makeController = (isDev: boolean, peeked: any = null) => {
  const mailer = { isDev: () => isDev, peek: jest.fn(() => peeked) } as any
  const controller = new AuthController({} as any, {} as any, mailer)
  return { controller, mailer }
}

const req = (email?: string) => ({ query: { email } }) as unknown as Request

describe('AuthController /auth/dev/inbox gating (SEC-02)', () => {
  it('throws NotFound when the mailer is not in dev mode', () => {
    const { controller, mailer } = makeController(false)
    expect(() => controller.devInbox(req('victim@x.z'))).toThrow(NotFoundException)
    expect(mailer.peek).not.toHaveBeenCalled()
  })

  it('serves the peeked message when in dev mode', () => {
    const msg = { subject: 'OTP', body: 'code 123456', at: new Date() }
    const { controller } = makeController(true, msg)
    expect(controller.devInbox(req('me@x.z'))).toBe(msg)
  })
})
