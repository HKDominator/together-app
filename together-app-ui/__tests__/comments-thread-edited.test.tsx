// BUG-34: isEdited uses string comparison — same timestamp in different
// format (e.g. "...000Z" vs "...Z") incorrectly shows "edited".
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CommentsThread from '@/components/tasks/CommentsThread'
import type { Comment } from '@/types'

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ users: [{ id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'A' }] }),
}))
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', name: 'Alice', avatarColor: '#c0392b', initials: 'A' } }),
}))
vi.mock('@/lib/api', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/api')>()
  return { ...real, api: { listComments: vi.fn() } }
})
import { api } from '@/lib/api'

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'c1', taskId: 't1', authorId: 'u1', body: 'Hello',
    createdAt: '2024-01-01T12:00:00.000Z',
    updatedAt: '2024-01-01T12:00:00.000Z',
    ...overrides,
  }
}

describe('CommentsThread isEdited (BUG-34)', () => {
  it('does NOT show "edited" when updatedAt is same moment as createdAt (identical strings)', async () => {
    vi.mocked(api.listComments).mockResolvedValue([makeComment()])
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText('Hello'))
    expect(screen.queryByText(/edited/i)).toBeNull()
  })

  it('does NOT show "edited" when timestamps are same moment but different format (the string-compare bug)', async () => {
    vi.mocked(api.listComments).mockResolvedValue([makeComment({
      createdAt: '2024-01-01T12:00:00.000Z',
      updatedAt: '2024-01-01T12:00:00Z',   // no milliseconds — same moment
    })])
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText('Hello'))
    expect(screen.queryByText(/edited/i)).toBeNull()
  })

  it('DOES show "edited" when updatedAt is genuinely later', async () => {
    vi.mocked(api.listComments).mockResolvedValue([makeComment({
      createdAt: '2024-01-01T12:00:00.000Z',
      updatedAt: '2024-01-01T12:00:01.000Z',  // 1 second later
    })])
    render(<CommentsThread taskId="t1" />)
    await waitFor(() => screen.getByText('Hello'))
    expect(screen.getByText(/·\s*edited/i)).toBeInTheDocument()
  })
})
