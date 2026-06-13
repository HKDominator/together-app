// FD-17: Account IA — Profile and Security cards must be real navigable
// links, not disabled placeholders. The account index page currently has
// those sections as non-interactive "coming soon" divs.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AccountPage from '@/app/(app)/account/page'

describe('AccountPage — IA (FD-17)', () => {
  it('has a link to /account/profile', () => {
    render(<AccountPage />)
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/account/profile')
  })

  it('has a link to /account/security', () => {
    render(<AccountPage />)
    expect(screen.getByRole('link', { name: /security/i })).toHaveAttribute('href', '/account/security')
  })

  it('does not show any "coming soon" copy on the account index', () => {
    render(<AccountPage />)
    expect(screen.queryByText(/coming soon/i)).toBeNull()
  })

  it('all three account section cards are clickable links', () => {
    render(<AccountPage />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/account/sessions')
    expect(hrefs).toContain('/account/profile')
    expect(hrefs).toContain('/account/security')
  })
})
