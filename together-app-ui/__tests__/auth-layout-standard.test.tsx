// FD-11: Standardize auth layout (split vs centered) across all auth pages.
// Login and register use a 2-column split layout (md:grid-cols-2) with a
// decorative panel. Forgot-password and reset-password currently use a
// single-column centered layout. All four should look the same.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter:      () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock('@/lib/auth', () => ({
  auth: {
    recoverRequest: vi.fn(),
    recoverReset:   vi.fn(),
  },
}))

describe('ForgotPasswordPage — split layout (FD-11)', () => {
  it('renders a decorative split panel', async () => {
    const { default: ForgotPasswordPage } = await import('@/app/forgot-password/page')
    render(<ForgotPasswordPage />)
    expect(document.querySelector('[data-testid="auth-panel"]')).toBeInTheDocument()
  })

  it('wraps content in a 2-column grid', async () => {
    const { default: ForgotPasswordPage } = await import('@/app/forgot-password/page')
    render(<ForgotPasswordPage />)
    const grid = document.querySelector('.md\\:grid-cols-2')
    expect(grid).toBeInTheDocument()
  })
})

describe('ResetPasswordPage — split layout (FD-11)', () => {
  it('renders a decorative split panel', async () => {
    const { default: ResetPasswordPage } = await import('@/app/reset-password/page')
    render(<ResetPasswordPage />)
    expect(document.querySelector('[data-testid="auth-panel"]')).toBeInTheDocument()
  })

  it('wraps content in a 2-column grid', async () => {
    const { default: ResetPasswordPage } = await import('@/app/reset-password/page')
    render(<ResetPasswordPage />)
    const grid = document.querySelector('.md\\:grid-cols-2')
    expect(grid).toBeInTheDocument()
  })
})
