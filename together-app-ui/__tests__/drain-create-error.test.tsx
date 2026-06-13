// BUG-21: failed offline create must not vanish silently — show drain error
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, prefetchRef: { current: null } }),
}))
vi.mock('@/lib/activity', () => ({
  trackSearch: vi.fn(), trackFilters: vi.fn(), trackTask: vi.fn(),
}))

const mockClear = vi.fn()

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [], users: [],
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    pendingCount: 0, generatorRunning: false,
    startGenerator: vi.fn(), stopGenerator: vi.fn(),
    hasMore: false, totalTasks: 0, isLoadingMore: false,
    loadMore: vi.fn(), prefetchNext: vi.fn(),
    drainError: '"Buy milk" could not be saved: Title too short',
    clearDrainError: mockClear,
  }),
}))

describe('drain create error display (BUG-21)', () => {
  it('shows the drain error when drainError is set', () => {
    render(<TasksPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Buy milk')
  })

  it('calls clearDrainError when dismissed', () => {
    render(<TasksPage />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(mockClear).toHaveBeenCalledOnce()
  })
})
