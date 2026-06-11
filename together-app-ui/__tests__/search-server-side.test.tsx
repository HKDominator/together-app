// BUG-35: search is client-side only, missing tasks not yet loaded.
// Fix: debounce search input → api.listTasks({ search }) → show server results.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'
import type { Task } from '@/types'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, prefetchRef: { current: null } }),
}))
vi.mock('@/lib/activity', () => ({
  trackSearch: vi.fn(), trackFilters: vi.fn(), trackTask: vi.fn(),
}))

const SERVER_TASK: Task = {
  id: 'server-1', title: 'Unique Server Task', description: '', state: 'todo', priority: 'medium',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
}

const mockListTasks = vi.fn()
vi.mock('@/lib/api', () => ({
  isNetworkError: () => false,
  api: {
    listTasks:  (...args: unknown[]) => mockListTasks(...args),
    listUsers:  () => Promise.resolve([]),
  },
}))

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [],  // no pre-loaded tasks — search must go server-side to find anything
    users: [],
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    pendingCount: 0, generatorRunning: false,
    startGenerator: vi.fn(), stopGenerator: vi.fn(),
    hasMore: false, totalTasks: 0, isLoadingMore: false,
    loadMore: vi.fn(), prefetchNext: vi.fn(),
    drainError: null, clearDrainError: vi.fn(),
  }),
}))

describe('server-side search (BUG-35)', () => {
  beforeEach(() => {
    mockListTasks.mockResolvedValue({ items: [SERVER_TASK], page: 1, total: 1, totalPages: 1 })
  })

  it('calls api.listTasks with search param after debounce and shows server result', async () => {
    render(<TasksPage />)

    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'Unique' } })

    // Server result appears once the 400ms debounce fires and the promise resolves.
    // The task was NOT in tasks:[] so it can only come from the server call.
    await waitFor(() => screen.getByText('Unique Server Task'), { timeout: 2000 })

    expect(mockListTasks).toHaveBeenCalledWith(expect.objectContaining({ search: 'Unique' }))
  })

  it('clears server results when search is erased', async () => {
    render(<TasksPage />)

    const input = screen.getByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'Unique' } })
    await waitFor(() => screen.getByText('Unique Server Task'), { timeout: 2000 })

    // Clear the search — searchResults immediately set to null
    fireEvent.change(input, { target: { value: '' } })
    await waitFor(() => expect(screen.queryByText('Unique Server Task')).toBeNull())
  })
})
