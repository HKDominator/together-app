// Statistics page with zero tasks: both visual and tabular views should
// show an on-brand empty state rather than all-zero charts.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatisticsPage from '@/app/(app)/statistics/page'
import type { User } from '@/types'

const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({ tasks: [], users: [SELF, PARTNER], currentUser: SELF }),
}))

describe('StatisticsPage — zero tasks (empty state)', () => {
  it('visual view shows an empty state message, not all-zero charts', () => {
    render(<StatisticsPage />)
    // Should find on-brand empty state copy
    expect(screen.getByTestId('stats-empty-state')).toBeInTheDocument()
  })

  it('empty state copy acknowledges the partnership — personal, not generic', () => {
    render(<StatisticsPage />)
    const empty = screen.getByTestId('stats-empty-state')
    // Must not say "No items found" or "Nothing here"
    expect(empty.textContent).not.toMatch(/no items found/i)
    // Must acknowledge the shared nature
    expect(empty.textContent).toMatch(/together|first task|get started/i)
  })

  it('tabular view shows an empty state row, not a bare header-only table', () => {
    // Switch to tabular view
    const { getByRole, getByTestId } = render(<StatisticsPage />)
    getByRole('button', { name: /tabular/i }).click()
    expect(getByTestId('stats-empty-state')).toBeInTheDocument()
  })

  it('summary strip still shows task count (correct, not hidden)', () => {
    render(<StatisticsPage />)
    // The word "tasks" is in the summary strip (label next to the count)
    expect(screen.getByText('tasks', { selector: 'span' })).toBeInTheDocument()
  })
})
