// BUG-29: ChatPanel history failure must show an error, not silently stay empty
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPanel from '@/components/chat/ChatPanel'

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice', avatarColor: '#c0392b' } }),
}))

const mockSocket = {
  on:   vi.fn(),
  off:  vi.fn(),
  emit: vi.fn(),
}
vi.mock('@/lib/chat-ws', () => ({
  getChatSocket: () => mockSocket,
}))

vi.mock('@/lib/chat-api', () => ({
  chatApi: { history: vi.fn() },
}))

import { chatApi } from '@/lib/chat-api'

beforeEach(() => { vi.clearAllMocks() })

describe('ChatPanel history error (BUG-29)', () => {
  it('shows an error when history fails to load', async () => {
    vi.mocked(chatApi.history).mockRejectedValue(new Error('HTTP 500'))

    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i)
    )
  })

  it('shows no error when history loads successfully', async () => {
    vi.mocked(chatApi.history).mockResolvedValue([])

    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))

    await waitFor(() => screen.getByText(/no messages yet/i))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
