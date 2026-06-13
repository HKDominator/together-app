// CR-04: PIN step must have a back button so the user is not trapped
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from '@/app/login/page'

const mockRouter = { push: vi.fn() }
vi.mock('next/navigation', () => ({ useRouter: () => mockRouter }))

const mockLogin    = vi.fn()
const mockVerifyOtp = vi.fn()
const mockVerifyPin = vi.fn()
const mockHydrate   = vi.fn()

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    login:     mockLogin,
    verifyOtp: mockVerifyOtp,
    verifyPin: mockVerifyPin,
    hydrate:   mockHydrate,
  }),
}))

async function reachPinStep() {
  mockLogin.mockResolvedValueOnce({ stage: 'otp', attemptId: 'a1' })
  mockVerifyOtp.mockResolvedValueOnce({ stage: 'pin', attemptId: 'a2' })

  render(<LoginPage />)

  // Step 1 — password
  fireEvent.change(screen.getByLabelText(/email/i),    { target: { value: 'user@example.com' } })
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))

  // Step 2 — OTP
  await waitFor(() => screen.getByLabelText(/verification code/i))
  fireEvent.change(screen.getByLabelText(/verification code/i), { target: { value: '123456' } })
  fireEvent.click(screen.getByRole('button', { name: /verify/i }))

  // Step 3 — PIN
  await waitFor(() => screen.getByLabelText(/security pin/i))
}

describe('Login PIN step (CR-04)', () => {
  it('shows a back button on the PIN step', async () => {
    await reachPinStep()
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
  })

  it('back button on PIN step returns to OTP step', async () => {
    await reachPinStep()
    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    await waitFor(() => expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument())
  })
})
