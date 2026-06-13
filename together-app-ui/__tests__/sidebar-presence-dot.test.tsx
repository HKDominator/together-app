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

// Presence state is controlled per-test via mockOnline and mockIsConnected
let mockOnline = new Set<string>()
let mockIsConnected: boolean | undefined = true
vi.mock('@/context/PresenceContext', () => ({
  usePresence: () => ({
    onlineUserIds:        mockOnline,
    viewingByUser:        {},
    setViewingTask:       vi.fn(),
    isPresenceConnected:  mockIsConnected,
  }),
}))

const dot = (name: string) =>
  screen.getByRole('img', { name: new RegExp(name, 'i') })

describe('Sidebar presence dot (FD-06)', () => {
  beforeEach(() => { mockIsConnected = true })

  it('partner dot uses success token when partner is online', () => {
    mockOnline = new Set(['u2'])
    render(<Sidebar />)
    expect(dot('bora is online')).toHaveClass('bg-success')
  })

  it('partner dot uses gray-500 token when partner is offline', () => {
    mockOnline = new Set()
    render(<Sidebar />)
    expect(dot('bora is offline')).toHaveClass('bg-gray-500')
  })

  it('self dot is always green regardless of presence state', () => {
    mockOnline = new Set()   // self NOT in onlineUserIds — dot still green
    render(<Sidebar />)
    expect(dot('ana is online')).toHaveClass('bg-success')
  })

  it('online dot has presence-dot-online class (bespoke 2s ease-in-out pulse)', () => {
    mockOnline = new Set(['u2'])
    render(<Sidebar />)
    expect(dot('ana is online')).toHaveClass('presence-dot-online')
    expect(dot('bora is online')).toHaveClass('presence-dot-online')
  })

  it('offline dot does not carry the pulse class', () => {
    mockOnline = new Set()
    render(<Sidebar />)
    expect(dot('bora is offline')).not.toHaveClass('motion-safe:animate-pulse')
  })

  it('partner dot shows gray when WS is disconnected, even if onlineUserIds still has them', () => {
    mockIsConnected = false
    mockOnline = new Set(['u2']) // stale data — WS just dropped
    render(<Sidebar />)
    // Partner should not appear green — stale "online" must not persist
    expect(screen.getByRole('img', { name: /bora/i })).toHaveClass('bg-gray-500')
    expect(screen.getByRole('img', { name: /bora/i })).not.toHaveClass('bg-success')
  })

  it('self dot stays green regardless of WS connection state', () => {
    mockIsConnected = false
    mockOnline = new Set()
    render(<Sidebar />)
    expect(dot('ana is online')).toHaveClass('bg-success')
  })
})
