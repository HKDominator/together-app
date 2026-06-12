// FD-07: 3-step login progress indicator.
// The multi-step login flow (password → verify → PIN) currently has no visual
// feedback about where you are. Tests assert an accessible progress nav is
// present and tracks the active step correctly.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login:     vi.fn().mockResolvedValue({ stage: 'otp', attemptId: 'a1', devOtp: '123456' }),
    verifyOtp: vi.fn().mockResolvedValue({ stage: 'pin', attemptId: 'a2' }),
    verifyPin: vi.fn().mockResolvedValue({}),
    hydrate:   vi.fn(),
  }),
}))

describe('LoginPage — step progress indicator (FD-07)', () => {
  it('renders a sign-in-steps navigation landmark', () => {
    render(<LoginPage />)
    expect(screen.getByRole('navigation', { name: /sign.?in steps/i })).toBeInTheDocument()
  })

  it('shows 3 step items in the progress indicator', () => {
    render(<LoginPage />)
    const nav = screen.getByRole('navigation', { name: /sign.?in steps/i })
    expect(nav.querySelectorAll('li')).toHaveLength(3)
  })

  it('marks step 1 as current on initial render', () => {
    render(<LoginPage />)
    const step1 = screen.getByLabelText(/step 1 of 3/i)
    expect(step1).toHaveAttribute('aria-current', 'step')
  })

  it('marks steps 2 and 3 as not current on initial render', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/step 2 of 3/i)).not.toHaveAttribute('aria-current', 'step')
    expect(screen.getByLabelText(/step 3 of 3/i)).not.toHaveAttribute('aria-current', 'step')
  })

  it('advances to step 2 after password is submitted', async () => {
    render(<LoginPage />)
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i),    { target: { value: 'pass1234' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/step 2 of 3/i)).toHaveAttribute('aria-current', 'step')
    )
    expect(screen.getByLabelText(/step 1 of 3/i)).not.toHaveAttribute('aria-current', 'step')
  })

  it('advances to step 3 after OTP is submitted', async () => {
    render(<LoginPage />)
    // Step 1 → 2
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByLabelText(/^password$/i),    { target: { value: 'pass1234' } })
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    await waitFor(() => screen.getByLabelText(/verification code/i))
    // Step 2 → 3
    fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /verify/i }))
    await waitFor(() =>
      expect(screen.getByLabelText(/step 3 of 3/i)).toHaveAttribute('aria-current', 'step')
    )
  })
})
