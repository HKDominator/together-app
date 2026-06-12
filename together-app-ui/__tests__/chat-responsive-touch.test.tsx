// AUD-10: All mobile touch targets must be ≥44px (CSS min-h-[44px]).
// AUD-12: ChatPanel must use a responsive width class so it doesn't overflow
//         on narrow screens (not a fixed w-80 that clips at <320px viewport).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ChatPanel from '@/components/chat/ChatPanel'

const mockSocket = {
  connected: true,
  on:   vi.fn(),
  off:  vi.fn(),
  emit: vi.fn(),
}

vi.mock('@/lib/chat-ws',  () => ({ getChatSocket: () => mockSocket }))
vi.mock('@/lib/chat-api', () => ({ chatApi: { history: vi.fn().mockResolvedValue([]) } }))

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

describe('ChatPanel — touch targets ≥44px (AUD-10)', () => {
  it('close button has min-h-[44px] class', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByRole('button', { name: /close chat/i }))
    const close = screen.getByRole('button', { name: /close chat/i })
    expect(close.className).toContain('min-h-[44px]')
  })

  it('send button has min-h-[44px] class', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByRole('button', { name: /^send$/i }))
    const send = screen.getByRole('button', { name: /^send$/i })
    expect(send.className).toContain('min-h-[44px]')
  })
})

describe('ChatPanel — responsive layout (AUD-12)', () => {
  it('panel container uses a responsive width (not a fixed w-80)', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByText(/no messages yet/i))
    const panel = screen.getByRole('banner').closest('div[class]')!.parentElement!
    // Responsive: must have sm: breakpoint class so it isn't clipped on narrow screens
    expect(panel.className).toMatch(/sm:w-/)
  })

  it('panel container has a max-width cap', async () => {
    render(<ChatPanel />)
    fireEvent.click(screen.getByRole('button', { name: /chat/i }))
    await waitFor(() => screen.getByText(/no messages yet/i))
    const panel = screen.getByRole('banner').closest('div[class]')!.parentElement!
    expect(panel.className).toMatch(/max-w-/)
  })
})
