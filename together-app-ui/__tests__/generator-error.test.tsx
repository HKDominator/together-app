// BUG-36: generator start/stop errors must be shown to the user
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TasksPage from '@/app/(app)/tasks/page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: { current: null }, prefetchRef: { current: null } }),
}))
vi.mock('@/lib/activity', () => ({
  trackSearch: vi.fn(), trackFilters: vi.fn(), trackTask: vi.fn(),
}))

const mockStartGenerator = vi.fn()
const mockStopGenerator  = vi.fn()

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [], users: [],
    createTask: vi.fn(), updateTask: vi.fn(), deleteTask: vi.fn(),
    pendingCount: 0, generatorRunning: false,
    startGenerator: mockStartGenerator,
    stopGenerator:  mockStopGenerator,
    hasMore: false, totalTasks: 0, isLoadingMore: false,
    loadMore: vi.fn(), prefetchNext: vi.fn(),
  }),
}))

describe('Generator error display (BUG-36)', () => {
  it('shows an error when startGenerator throws', async () => {
    mockStartGenerator.mockRejectedValue(new Error('Generator failed'))

    render(<TasksPage />)
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/generator/i)
    )
  })
})
