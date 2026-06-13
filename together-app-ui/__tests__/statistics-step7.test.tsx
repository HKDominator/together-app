// Step 7 — FD-03 + FD-04: Statistics rebuild.
// Contribution Ranking leaderboard deleted (CR-01 fabricated KPIs + CR-07
// hardcoded "Ana"/"Dan" legend names die with it).  Replaced by a single
// "Moved Together" weekly shared chart + two summary lines.
// ADR-0001: no per-person split anywhere.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatisticsPage from '@/app/(app)/statistics/page'
import type { Task, User } from '@/types'

// ── fixtures ──────────────────────────────────────────────────────────
const SELF:    User = { id: 'u1', name: 'Ana',  role: 'owner',   avatarColor: '#C0392B', initials: 'AN' }
const PARTNER: User = { id: 'u2', name: 'Bora', role: 'partner', avatarColor: '#1A2535', initials: 'BO' }

const DONE_TASK: Task = {
  id: 't1', title: 'Done task', description: '', state: 'done', priority: 'high',
  assigneeId: 'u1', createdById: 'u1', dueDate: null,
  createdAt: new Date('2025-01-01') as unknown as Date,
  updatedAt: new Date()             as unknown as Date,
}

vi.mock('@/context/TasksContext', () => ({
  useTasks: () => ({
    tasks: [DONE_TASK],
    users: [SELF, PARTNER],
    currentUser: SELF,
  }),
}))

describe('Statistics Step 7 — FD-03 + FD-04 rebuild', () => {

  // ── deletions ─────────────────────────────────────────────────────

  it('does not render the Contribution Ranking h2 (FD-03)', () => {
    render(<StatisticsPage />)
    // selector:'h2' avoids multi-match from ancestor elements
    expect(screen.queryByText(/Contribution Ranking/i, { selector: 'h2' })).toBeNull()
  })

  it('does not show the fabricated "+12% vs last month" text (CR-01)', () => {
    render(<StatisticsPage />)
    expect(document.body.textContent).not.toMatch(/\+12%/)
  })

  it('does not show the fabricated "Balanced" sub-metric (CR-01)', () => {
    render(<StatisticsPage />)
    expect(document.body.textContent).not.toMatch(/Balanced/)
  })

  it('does not show the per-person "Ana / Dan Split" KPI label (ADR-0001)', () => {
    render(<StatisticsPage />)
    expect(document.body.textContent).not.toMatch(/Ana.*Dan Split/)
  })

  // ── additions ─────────────────────────────────────────────────────

  it('renders a "Moved Together" chart heading (h2)', () => {
    render(<StatisticsPage />)
    expect(screen.getByText(/Moved Together/i, { selector: 'h2' })).toBeInTheDocument()
  })

  it('shows a "tasks done this week" summary line (p element)', () => {
    render(<StatisticsPage />)
    expect(screen.getByText(/tasks done this week/i, { selector: 'p' })).toBeInTheDocument()
  })

  it('shows a "completion rate overall" summary line (p element)', () => {
    render(<StatisticsPage />)
    expect(screen.getByText(/completion rate overall/i, { selector: 'p' })).toBeInTheDocument()
  })
})
