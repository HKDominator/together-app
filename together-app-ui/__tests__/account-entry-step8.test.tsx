// Step 8 — FD-01: Sidebar footer account menu.
// Current-user avatar + name, link to /account, sign-out button.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'

const SELF:    User = { id: 'u1', name: 'Ana Bora', role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Dan Bora', role: 'partner', avatarColor: '#1A2535', initials: 'DB' }

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/components/layout/ActivityIndicator', () => ({ default: () => null }))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [SELF, PARTNER], currentUser: SELF }),
}))
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({ onlineUserIds: new Set<string>() }),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: false, logout: vi.fn() }),
}))

describe('Step 8 — Sidebar account footer (FD-01)', () => {
  it('renders a link to /account in the sidebar footer', () => {
    render(<Sidebar />)
    const link = screen.getByRole('link', { name: /account/i })
    expect(link).toHaveAttribute('href', '/account')
  })

  it('renders a sign-out button in the sidebar footer', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })
})
