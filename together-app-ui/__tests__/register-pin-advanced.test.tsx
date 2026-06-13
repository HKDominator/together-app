// FD-10: Security PIN field lives in a collapsed "Advanced" section.
// The field is currently exposed as a plain top-level FormInput, making
// the form feel like a SaaS enterprise registration. It should be tucked
// behind a toggle so casual users never see it.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RegisterPage from '@/app/register/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    register: vi.fn(),
    hydrate:  vi.fn(),
  }),
}))

describe('RegisterPage — PIN in collapsed advanced section (FD-10)', () => {
  it('does not show the PIN input by default', () => {
    render(<RegisterPage />)
    expect(screen.queryByLabelText(/security pin/i)).toBeNull()
  })

  it('shows an "Advanced" toggle button', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('button', { name: /advanced/i })).toBeInTheDocument()
  })

  it('reveals the PIN input when the toggle is clicked', () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.getByLabelText(/security pin/i)).toBeInTheDocument()
  })

  it('hides the PIN input again when the toggle is clicked a second time', () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.getByLabelText(/security pin/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.queryByLabelText(/security pin/i)).toBeNull()
  })

  it('shows plain-language copy explaining what a PIN does when expanded', () => {
    render(<RegisterPage />)
    fireEvent.click(screen.getByRole('button', { name: /advanced/i }))
    expect(screen.getByText(/extra sign.?in security/i)).toBeInTheDocument()
  })

  it('does not render "3FA" or technical jargon in the visible UI copy', () => {
    render(<RegisterPage />)
    expect(document.body.textContent).not.toMatch(/3FA/)
    expect(document.body.textContent).not.toMatch(/enables.*FA/i)
  })
})
