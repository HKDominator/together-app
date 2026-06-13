// Step 8 — FD-02: /account index page.
// Heading + link to /account/sessions (+ placeholder cards for profile/security).
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AccountPage from '@/app/(app)/account/page'

describe('Step 8 — /account index page (FD-02)', () => {
  it('renders an Account heading', () => {
    render(<AccountPage />)
    expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument()
  })

  it('has a link to /account/sessions', () => {
    render(<AccountPage />)
    expect(screen.getByRole('link', { name: /sessions/i })).toHaveAttribute('href', '/account/sessions')
  })
})
