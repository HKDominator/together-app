// FD-05: CommentsThread shows "You" for own comments and partner name for partner's.
// Runs with the real CommentsThread component (not mocked) so the actual
// author-label render path is exercised.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CommentsThread from '@/components/tasks/CommentsThread'
import type { Comment } from '@/types'

// ── socket mock ────────────────────────────────────────────────────────
let wsHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
const mockSocket = {
  on:  (ev: string, cb: (...args: unknown[]) => void) => { (wsHandlers[ev] ??= []).push(cb) },
  off: (ev: string, cb: (...args: unknown[]) => void) => {
    wsHandlers[ev] = (wsHandlers[ev] ?? []).filter(h => h !== cb)
  },
  emit: vi.fn(),
}
vi.mock('@/lib/ws', () => ({ getSocket: () => mockSocket }))

vi.mock('@/context/AuthContext',  () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    users: [
      { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' },
      { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' },
    ],
  }),
}))

// vi.fn() inside the factory avoids the hoisting/initialisation error.
vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listComments:  vi.fn().mockResolvedValue([]),
    addComment:    vi.fn(),
    editComment:   vi.fn(),
    deleteComment: vi.fn(),
  },
}))

const SELF_COMMENT: Comment = {
  id: 'c1', taskId: 't1', authorId: 'u1', body: 'Hello from self',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}
const PARTNER_COMMENT: Comment = {
  id: 'c2', taskId: 't1', authorId: 'u2', body: 'Hello from partner',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('FD-05 — CommentsThread author identity label', () => {
  beforeEach(async () => {
    wsHandlers = {}
    const { api } = await import('@/lib/api')
    vi.mocked(api.listComments).mockReset()
    vi.mocked(api.listComments).mockResolvedValue([])
  })

  it('shows "You" as the author header for own comments', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.listComments).mockResolvedValueOnce([SELF_COMMENT])

    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText('Hello from self'))
    // Author header span should say "You", not "Ana"
    expect(screen.getByText('You', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('Ana', { selector: 'span' })).toBeNull()
  })

  it('shows the partner name as author header for partner comments', async () => {
    const { api } = await import('@/lib/api')
    vi.mocked(api.listComments).mockResolvedValueOnce([PARTNER_COMMENT])

    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText('Hello from partner'))
    expect(screen.getByText('Bora', { selector: 'span' })).toBeInTheDocument()
  })
})
