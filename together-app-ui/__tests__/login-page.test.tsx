// SEC-07: the seeded demo admin credentials (and PIN) must never be rendered
// into the login page / shipped in the client bundle. A real, weakly-protected
// admin account existed with these creds; printing them to every visitor is an
// account-takeover handoff.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoginPage from '@/app/login/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login: vi.fn(),
    verifyOtp: vi.fn(),
    verifyPin: vi.fn(),
    hydrate: vi.fn(),
  }),
}))

describe('LoginPage credential exposure (SEC-07)', () => {
  it('does not render any seeded demo credentials', () => {
    render(<LoginPage />)
    const html = document.body.innerHTML
    expect(html).not.toMatch(/anaana123/i)
    expect(html).not.toMatch(/dandan123/i)
    expect(html).not.toMatch(/PIN\s*1234/i)
    expect(screen.queryByText(/demo accounts/i)).toBeNull()
  })
})
