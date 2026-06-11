// FD-06: sidebar presence dots wired to real onlineUserIds from PresenceContext.
// Self is always online (green); partner dot tracks actual presence state.
// Online dot carries motion-safe:animate-pulse so reduced-motion users see a
// solid color with no animation (DESIGN.md §5 — global, no exceptions).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import Sidebar from '@/components/layout/Sidebar'
import type { User } from '@/types'

const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
vi.mock('@/components/layout/ActivityIndicator', () => ({ default: () => null }))
vi.mock('@/context/AuthContext',  () => ({ useAuth:    () => ({ isAdmin: false }) }))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [SELF, PARTNER], currentUser: SELF }),
}))

// Presence state is controlled per-test via mockOnline
let mockOnline = new Set<string>()
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({
    onlineUserIds:  mockOnline,
    viewingByUser:  {},
    setViewingTask: vi.fn(),
  }),
}))

const dot = (name: string) =>
  screen.getByRole('img', { name: new RegExp(name, 'i') })

describe('Sidebar presence dot (FD-06)', () => {
  it('partner dot is green when partner is online', () => {
    mockOnline = new Set(['u2'])
    render(<Sidebar />)
    expect(dot('bora is online')).toHaveStyle({ background: '#27AE60' })
  })

  it('partner dot is gray when partner is offline', () => {
    mockOnline = new Set()
    render(<Sidebar />)
    expect(dot('bora is offline')).toHaveStyle({ background: '#6B7280' })
  })

  it('self dot is always green regardless of presence state', () => {
    mockOnline = new Set()   // self NOT in onlineUserIds — dot still green
    render(<Sidebar />)
    expect(dot('ana is online')).toHaveStyle({ background: '#27AE60' })
  })

  it('online dot has motion-safe:animate-pulse class; offline dot does not', () => {
    mockOnline = new Set(['u2'])
    render(<Sidebar />)
    expect(dot('ana is online')).toHaveClass('motion-safe:animate-pulse')
    expect(dot('bora is online')).toHaveClass('motion-safe:animate-pulse')
  })

  it('offline dot does not carry the pulse class', () => {
    mockOnline = new Set()
    render(<Sidebar />)
    expect(dot('bora is offline')).not.toHaveClass('motion-safe:animate-pulse')
  })
})
