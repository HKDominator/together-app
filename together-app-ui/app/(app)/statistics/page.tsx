'use client'
import { useState, useMemo } from 'react'
import { useTasks } from '@/context/TasksContext'
import { Priority, TaskState } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip from '@/components/ui/StateChip'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Token-compliant colors via CSS custom properties (DESIGN.md §2 Token Law).
// Reference tokens defined in globals.css @theme inline — never hardcoded hex.
const STATE_COLOR: Record<TaskState, string> = {
  done:        'var(--color-success)',
  in_progress: 'var(--color-info)',
  todo:        'var(--color-sl-dim)',
  cancelled:   'var(--color-cm)',
}

const PRIORITY_COLOR: Record<Priority, string> = {
  high:   'var(--color-danger)',
  medium: 'var(--color-warning)',
  low:    'var(--color-success)',
}

// ── Donut chart ────────────────────────────────────────────────────────
function DonutChart({
  data,
  ariaLabel,
}: {
  data: { label: string; value: number; color: string }[]
  ariaLabel: string
}) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset = 0
  const R = 45
  const C = 2 * Math.PI * R

  return (
    <div className="flex items-center gap-6">
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        role="img"
        aria-label={ariaLabel}
        className="shrink-0"
      >
        {total === 0 ? (
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-cm)" strokeWidth="18" />
        ) : (
          data.map((d, i) => {
            const pct  = d.value / total
            const dash = pct * C
            const gap  = C - dash
            const rot  = (offset / total) * 360 - 90
            offset += d.value
            return (
              <circle
                key={i}
                cx="60" cy="60" r={R}
                fill="none"
                stroke={d.color}
                strokeWidth="18"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={0}
                transform={`rotate(${rot} 60 60)`}
                className="motion-safe:transition-all motion-safe:duration-500"
              />
            )
          })
        )}
        <text x="60" y="55" textAnchor="middle" fontSize={14} fontWeight={700}
          className="fill-sl font-display">
          {total}
        </text>
        <text x="60" y="70" textAnchor="middle" fontSize={12}
          className="fill-sl-dim">
          tasks
        </text>
      </svg>

      <div className="flex flex-col gap-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-sl-muted">{d.label}</span>
            <span className="ml-auto font-semibold text-sl pl-3">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Moved Together chart ───────────────────────────────────────────────
function MovedTogetherChart({ data }: { data: { label: string; count: number }[] }) {
  const maxVal = Math.max(...data.map(w => w.count), 1)
  const H = 120

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map(w => (
        <div key={w.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full rounded-t-sm bg-cr motion-safe:transition-all motion-safe:duration-700"
            style={{ height: `${Math.max((w.count / maxVal) * H, 2)}px` }}
          />
          <span className="text-xs text-sl-muted">{w.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatisticsPage() {
  const { tasks, users } = useTasks()
  const [view, setView] = useState<'visual' | 'tabular'>('visual')

  // ── Derived stats ──────────────────────────────────────────────────
  const total   = tasks.length
  const done    = tasks.filter(t => t.state === 'done').length
  const overdue = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.state !== 'done' && t.state !== 'cancelled'
  ).length

  const completionRatePlain = total ? Math.round(done / total * 100) : 0

  const doneThisWeek = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS
    return tasks.filter(t => t.state === 'done' && new Date(t.updatedAt).getTime() > cutoff).length
  }, [tasks])

  const donutData = useMemo(() => [
    { label: 'Done',        value: tasks.filter(t => t.state === 'done').length,        color: STATE_COLOR.done },
    { label: 'In Progress', value: tasks.filter(t => t.state === 'in_progress').length,  color: STATE_COLOR.in_progress },
    { label: 'To Do',       value: tasks.filter(t => t.state === 'todo').length,         color: STATE_COLOR.todo },
    { label: 'Cancelled',   value: tasks.filter(t => t.state === 'cancelled').length,    color: STATE_COLOR.cancelled },
  ], [tasks])

  const priorityData = useMemo(() => [
    { label: 'High',   value: tasks.filter(t => t.priority === 'high').length,   pct: total ? Math.round(tasks.filter(t => t.priority === 'high').length   / total * 100) : 0, color: PRIORITY_COLOR.high },
    { label: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, pct: total ? Math.round(tasks.filter(t => t.priority === 'medium').length / total * 100) : 0, color: PRIORITY_COLOR.medium },
    { label: 'Low',    value: tasks.filter(t => t.priority === 'low').length,    pct: total ? Math.round(tasks.filter(t => t.priority === 'low').length    / total * 100) : 0, color: PRIORITY_COLOR.low },
  ], [tasks, total])

  const weeklyData = useMemo(() => {
    const now = new Date()
    const buckets: { label: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now)
      start.setDate(start.getDate() - i * 7 - 6)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 7)
      const label = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      const count = tasks.filter(t => {
        if (t.state !== 'done') return false
        const d = new Date(t.updatedAt)
        return d >= start && d < end
      }).length
      buckets.push({ label, count })
    }
    return buckets
  }, [tasks])

  const rankedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pMap: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
      const sMap: Record<TaskState, number> = { done: 3, in_progress: 2, todo: 1, cancelled: 0 }
      return (pMap[b.priority] + sMap[b.state]) - (pMap[a.priority] + sMap[a.state])
    })
  }, [tasks])

  const donutAriaLabel = `Task status: ${donutData[0].value} done, ${donutData[1].value} in progress, ${donutData[2].value} to do, ${donutData[3].value} cancelled`

  return (
    <div className="p-9">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <h1 className="font-display text-3xl font-bold text-sl">Statistics</h1>
        <div className="flex bg-surface rounded-lg p-1 gap-1 border border-cm">
          <button
            onClick={() => setView('visual')}
            className={[
              'px-4 py-2 rounded-md text-sm font-medium',
              'motion-safe:transition-colors motion-safe:duration-150',
              view === 'visual' ? 'bg-sl text-white' : 'text-sl-muted hover:text-sl',
            ].join(' ')}
          >
            Visual
          </button>
          <button
            onClick={() => setView('tabular')}
            className={[
              'px-4 py-2 rounded-md text-sm font-medium',
              'motion-safe:transition-colors motion-safe:duration-150',
              view === 'tabular' ? 'bg-sl text-white' : 'text-sl-muted hover:text-sl',
            ].join(' ')}
          >
            Tabular
          </button>
        </div>
      </div>

      {/* ── Summary strip — compact context, no pressure ─────────────── */}
      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-10 pb-8 border-b border-cm">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sl">{total}</span>
          <span className="text-sm text-sl-muted">tasks</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sl">{done}</span>
          <span className="text-sm text-sl-muted">done</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sl">{completionRatePlain}%</span>
          <span className="text-sm text-sl-muted">complete</span>
        </div>
        {overdue > 0 && (
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-sl">{overdue}</span>
            <span className="text-sm text-sl-muted">overdue</span>
          </div>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold text-sl">{doneThisWeek}</span>
          <span className="text-sm text-sl-muted">moved this week</span>
        </div>
      </div>

      {/* ══ EMPTY STATE (both views) ═════════════════ */}
      {total === 0 && (
        <div
          data-testid="stats-empty-state"
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <p className="text-base font-semibold text-sl mb-2">
            Nothing to measure yet
          </p>
          <p className="text-sm text-sl-muted max-w-xs">
            Add your first task together and your shared progress will show up here.
          </p>
        </div>
      )}

      {/* ══ VISUAL VIEW ══════════════════════════════ */}
      {view === 'visual' && total > 0 && (
        <div className="flex flex-col gap-6">

          {/* Moved Together — hero */}
          <div className="bg-surface rounded-2xl p-7 border border-cm">
            <h2 className="font-display text-lg font-semibold text-sl mb-1">Moved Together</h2>
            <p className="text-xs text-sl-muted mb-4">Weekly tasks moved to done — shared progress</p>
            <p className="text-sm text-sl-muted mb-1">
              <strong className="font-semibold text-sl">{doneThisWeek}</strong>{' '}tasks done this week
            </p>
            <p className="text-sm text-sl-muted mb-6">
              <strong className="font-semibold text-sl">{completionRatePlain}%</strong>{' '}completion rate overall
            </p>
            <MovedTogetherChart data={weeklyData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Status Breakdown */}
            <div className="bg-surface rounded-2xl p-7 border border-cm">
              <h2 className="font-display text-lg font-semibold text-sl mb-1">Status Breakdown</h2>
              <p className="text-xs text-sl-muted mb-6">Current distribution across all tasks</p>
              <DonutChart data={donutData} ariaLabel={donutAriaLabel} />
            </div>

            {/* Priority Split */}
            <div className="bg-surface rounded-2xl p-7 border border-cm">
              <h2 className="font-display text-lg font-semibold text-sl mb-1">Priority Split</h2>
              <p className="text-xs text-sl-muted mb-6">Distribution by urgency</p>
              <div className="flex flex-col gap-4">
                {priorityData.map(p => (
                  <div key={p.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-sl font-medium">{p.label}</span>
                      <span className="text-sl-muted">{p.value} · {p.pct}%</span>
                    </div>
                    <div className="h-2 bg-cm rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full motion-safe:transition-all motion-safe:duration-700"
                        style={{ width: `${p.pct}%`, background: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TABULAR VIEW ═════════════════════════════ */}
      {view === 'tabular' && total > 0 && (
        <div className="bg-surface rounded-2xl border border-cm overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-cm-pale border-b border-cm">
              {['#', 'Task', 'Assignee', 'Priority', 'Status', 'Due'].map(h => (
                <span key={h} className="text-xs font-semibold uppercase tracking-wide text-sl-muted">{h}</span>
              ))}
            </div>

            {rankedTasks.map((t, i) => {
              const u = users.find(u => u.id === t.assigneeId)
              return (
                <div
                  key={t.id}
                  className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] px-6 py-3.5 border-b border-cm last:border-b-0 items-center hover:bg-cm-pale motion-safe:transition-colors motion-safe:duration-150"
                >
                  <span className="text-xs text-sl-muted font-medium">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-sl truncate max-w-xs">{t.title}</p>
                    <p className="text-xs text-sl-muted">
                      {t.state === 'done' ? 'Completed' : t.state === 'in_progress' ? 'In progress' : 'Not started'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ background: u.avatarColor, fontSize: 12 }}
                      >
                        {u.initials}
                      </div>
                    )}
                    <span className="text-xs text-sl-muted">{u?.name.split(' ')[0]}</span>
                  </div>
                  <PriorityBadge priority={t.priority} />
                  <StateChip state={t.state} />
                  <span className="text-xs text-sl-muted">
                    {t.dueDate
                      ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                      : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
