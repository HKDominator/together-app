// BUG-33: CommentsThread must subscribe to WS comment events for realtime updates.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import CommentsThread from '@/components/tasks/CommentsThread'
import type { Comment } from '@/types'

// ── task WS socket mock ────────────────────────────────────────────────
let wsHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
const mockWsSocket = {
  on:  (ev: string, cb: (...args: unknown[]) => void) => { (wsHandlers[ev] ??= []).push(cb) },
  off: (ev: string, cb: (...args: unknown[]) => void) => {
    wsHandlers[ev] = (wsHandlers[ev] ?? []).filter(h => h !== cb)
  },
}
const emitWs = (ev: string, payload: unknown) =>
  (wsHandlers[ev] ?? []).forEach(h => h(payload))

vi.mock('@/lib/ws',              () => ({ getSocket: () => mockWsSocket }))
vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [{ id: 'u1', name: 'Alice', avatarColor: '#c00', initials: 'AL' }] }),
}))
vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listComments: () => Promise.resolve([]),
    addComment:   vi.fn(),
    editComment:  vi.fn(),
    deleteComment:vi.fn(),
  },
}))

const C1: Comment = {
  id: 'c1', taskId: 't1', authorId: 'u1', body: 'Hello world',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
}

describe('CommentsThread realtime (BUG-33)', () => {
  beforeEach(() => { wsHandlers = {} })

  it('inserts a new comment when comment:created fires for this taskId', async () => {
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText(/no comments yet/i))

    act(() => { emitWs('comment:created', C1) })

    await waitFor(() => screen.getByText('Hello world'))
  })

  it('ignores comment:created for a different taskId', async () => {
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText(/no comments yet/i))

    act(() => { emitWs('comment:created', { ...C1, taskId: 't2' }) })

    expect(screen.queryByText('Hello world')).toBeNull()
  })

  it('replaces comment body when comment:updated fires', async () => {
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText(/no comments yet/i))

    act(() => { emitWs('comment:created', C1) })
    await waitFor(() => screen.getByText('Hello world'))

    act(() => { emitWs('comment:updated', { ...C1, body: 'Edited text', updatedAt: new Date().toISOString() }) })

    await waitFor(() => screen.getByText('Edited text'))
    expect(screen.queryByText('Hello world')).toBeNull()
  })

  it('removes a comment when comment:deleted fires', async () => {
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText(/no comments yet/i))

    act(() => { emitWs('comment:created', C1) })
    await waitFor(() => screen.getByText('Hello world'))

    act(() => { emitWs('comment:deleted', { id: 'c1', taskId: 't1' }) })

    await waitFor(() => screen.getByText(/no comments yet/i))
  })
})
