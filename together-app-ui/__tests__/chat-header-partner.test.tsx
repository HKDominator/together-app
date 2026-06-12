// FD-12: Chat header must show the partner's name, not "Workspace chat".
// The term "Workspace" is enterprise copy that doesn't fit a couples app.
// The open panel header and the Sidebar section label should both drop it.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPanel from '@/components/chat/ChatPanel'

const mockSocket = {
  connected: true,
  on:   vi.fn(),
  off:  vi.fn(),
  emit: vi.fn(),
}

vi.mock('@/lib/chat-ws', () => ({
  getChatSocket: () => mockSocket,
}))

vi.mock('@/lib/chat-api', () => ({
  chatApi: { history: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice', avatarColor: '#c0392b' } }),
}))

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    users:       [
      { id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'AL' },
      { id: 'u2', name: 'Bob',   avatarColor: '#2980b9', initials: 'BO' },
    ],
    currentUser: { id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'AL' },
  }),
}))

beforeEach(() => { vi.clearAllMocks() })

describe('ChatPanel header — partner name (FD-12)', () => {
  it('shows the partner name in the open panel header', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByText(/no messages yet/i))
    expect(screen.getByRole('banner')).toHaveTextContent(/Bob/i)
  })

  it('does not show "Workspace" copy in the panel header', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByText(/no messages yet/i))
    expect(screen.getByRole('banner').textContent).not.toMatch(/workspace/i)
  })

  it('still shows a close button inside the open panel', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByRole('button', { name: /close chat/i }))
  })
})
