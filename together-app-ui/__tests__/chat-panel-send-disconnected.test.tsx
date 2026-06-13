// BUG-28: ChatPanel drops messages silently when the chat socket is disconnected.
// Fix: check sock.connected before emit; show an error if not connected.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPanel from '@/components/chat/ChatPanel'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice', avatarColor: '#c0392b' } }),
}))

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    users:       [{ id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'AL' }],
    currentUser: { id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'AL' },
  }),
}))

const mockSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn(), connected: false }
vi.mock('@/lib/chat-ws', () => ({ getChatSocket: () => mockSocket }))
vi.mock('@/lib/chat-api', () => ({ chatApi: { history: vi.fn() } }))

import { chatApi } from '@/lib/chat-api'

beforeEach(() => {
  vi.clearAllMocks()
  mockSocket.connected = false
  vi.mocked(chatApi.history).mockResolvedValue([])
})

async function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /chat/i }))
  await waitFor(() => screen.getByText(/no messages yet/i))
}

describe('ChatPanel send while disconnected (BUG-28)', () => {
  it('shows an error and does not emit when socket is disconnected', async () => {
    mockSocket.connected = false
    render(<ChatPanel />)
    await openPanel()

    fireEvent.change(screen.getByPlaceholderText(/type a message/i), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/disconnected/i)
    expect(mockSocket.emit).not.toHaveBeenCalledWith('chat:send', expect.anything())
  })

  it('emits and clears the draft when socket is connected', async () => {
    mockSocket.connected = true
    render(<ChatPanel />)
    await openPanel()

    fireEvent.change(screen.getByPlaceholderText(/type a message/i), { target: { value: 'Hello' } })
    fireEvent.click(screen.getByRole('button', { name: /send/i }))

    expect(mockSocket.emit).toHaveBeenCalledWith('chat:send', expect.objectContaining({ body: 'Hello' }))
    expect(screen.getByPlaceholderText(/type a message/i)).toHaveValue('')
  })
})
