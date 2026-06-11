'use client'
import { useState, useMemo, useEffect } from 'react'
import { useTasks } from '@/context/TasksContext'
import { Priority, TaskState } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip from '@/components/ui/StateChip'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// ── Animated counter hook ──────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    let start = 0
    const step = target / (duration / 16)
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setValue(target); clearInterval(timer) }
      else setValue(Math.floor(start))
    }, 16)
    return () => clearInterval(timer)
  }, [target, duration])
  return value
}

// ── Donut chart ────────────────────────────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset = 0
  const R = 45
  const C = 2 * Math.PI * R

  return (
    <div className="flex items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
        {total === 0 ? (
          <circle cx="60" cy="60" r={R} fill="none" stroke="#e5e7eb" strokeWidth="18" />
        ) : (
          data.map((d, i) => {
            const pct   = d.value / total
            const dash  = pct * C
            const gap   = C - dash
            const rot   = (offset / total) * 360 - 90
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
                className="transition-all duration-500"
              />
            )
          })
        )}
        <text x="60" y="55" textAnchor="middle" className="text-xs font-bold fill-slate-700"
          style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>
          {total}
        </text>
        <text x="60" y="70" textAnchor="middle"
          style={{ fontFamily: 'var(--font-body)', fontSize: 12, fill: '#8FA3B1' }}>
          tasks
        </text>
      </svg>

      <div className="flex flex-col gap-2">
        {data.map(d => (
          <div key={d.label} className="flex items-center gap-2 text-xs">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
            <span className="text-gray-500">{d.label}</span>
            <span className="ml-auto font-semibold text-gray-700 pl-3">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Moved Together chart ───────────────────────────────────────────────
// Single-color bars — total tasks moved to done per week, last 6 weeks.
// No per-person split (ADR-0001).
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
          <span className="text-xs text-gray-400">{w.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function StatisticsPage() {
  const { tasks, users } = useTasks()
  const [view, setView] = useState<'visual' | 'tabular'>('visual')

  // ── Derived stats ──────────────────────────────────────────────────
  const total      = tasks.length
  const done       = tasks.filter(t => t.state === 'done').length
  const overdue    = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.state !== 'done' && t.state !== 'cancelled'
  ).length

  const totalCount     = useCountUp(total)
  const completionRate = useCountUp(total ? Math.round(done / total * 100) : 0)

  const recentCount = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return tasks.filter(t => new Date(t.createdAt).getTime() > cutoff).length
  }, [tasks])

  // Done this week — real count, no animation needed
  const doneThisWeek = useMemo(() => {
    const cutoff = Date.now() - WEEK_MS
    return tasks.filter(t => t.state === 'done' && new Date(t.updatedAt).getTime() > cutoff).length
  }, [tasks])

  // Completion rate as a plain number for summary line (no animation)
  const completionRatePlain = total ? Math.round(done / total * 100) : 0

  const donutData = [
    { label: 'Done',        value: tasks.filter(t => t.state === 'done').length,        color: '#27AE60' },
    { label: 'In Progress', value: tasks.filter(t => t.state === 'in_progress').length,  color: '#2980B9' },
    { label: 'To Do',       value: tasks.filter(t => t.state === 'todo').length,         color: '#E74C3C' },
    { label: 'Cancelled',   value: tasks.filter(t => t.state === 'cancelled').length,    color: '#95A5A6' },
  ]

  const priorityData = [
    { label: '▲ High',   value: tasks.filter(t => t.priority === 'high').length,   pct: total ? Math.round(tasks.filter(t => t.priority === 'high').length   / total * 100) : 0, color: '#C0392B' },
    { label: '■ Medium', value: tasks.filter(t => t.priority === 'medium').length, pct: total ? Math.round(tasks.filter(t => t.priority === 'medium').length / total * 100) : 0, color: '#F39C12' },
    { label: '▼ Low',    value: tasks.filter(t => t.priority === 'low').length,    pct: total ? Math.round(tasks.filter(t => t.priority === 'low').length    / total * 100) : 0, color: '#27AE60' },
  ]

  // Last 6 weeks — total tasks moved to done (shared, no per-person split)
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

  // Ranked tasks for tabular view (by priority + state score)
  const rankedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const pMap: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
      const sMap: Record<TaskState, number> = { done: 3, in_progress: 2, todo: 1, cancelled: 0 }
      return (pMap[b.priority] + sMap[b.state]) - (pMap[a.priority] + sMap[a.state])
    })
  }, [tasks])

  return (
    <div className="p-9">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Statistics</h1>
          <p className="text-xs text-gray-500">Workspace › Statistics › Tasks Overview</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 gap-1 border border-gray-100 shadow-sm">
          <button
            onClick={() => setView('visual')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${view === 'visual' ? 'bg-sl text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📊 Visual
          </button>
          <button
            onClick={() => setView('tabular')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all
              ${view === 'tabular' ? 'bg-sl text-white' : 'text-gray-500 hover:text-gray-700'}`}
          >
            📋 Tabular
          </button>
        </div>
      </div>

      {/* ── Summary cards (real data, no fabricated metrics) ─────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '✅', label: 'Total Tasks',     value: totalCount,          sub: `+${recentCount} this month`, up: true  },
          { icon: '🎯', label: 'Completion Rate', value: `${completionRate}%`, sub: `${done} of ${total} done`,  up: true  },
          { icon: '⚠️', label: 'Overdue Tasks',   value: overdue,             sub: 'need attention',             up: false },
          { icon: '🤝', label: 'Done This Week',  value: doneThisWeek,        sub: 'moved together',             up: true  },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="font-display text-3xl font-bold text-gray-800 leading-none mb-1">{s.value}</div>
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-xs font-semibold ${s.up ? 'text-green-600' : 'text-red-500'}`}>
              {s.up ? '↑' : '↓'} {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ══ VISUAL VIEW ══════════════════════════════ */}
      {view === 'visual' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Moved Together chart — replaces the per-person BarChart (CR-07) */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Moved Together</h2>
              <p className="text-xs text-gray-400 mb-2">Weekly tasks moved to done — shared progress</p>
              <p className="text-sm text-gray-600 mb-1">
                <strong className="font-semibold text-gray-800">{doneThisWeek}</strong>{' '}tasks done this week
              </p>
              <p className="text-sm text-gray-600 mb-6">
                <strong className="font-semibold text-gray-800">{completionRatePlain}%</strong>{' '}completion rate overall
              </p>
              <MovedTogetherChart data={weeklyData} />
            </div>

            {/* Donut — kept unchanged */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Status Breakdown</h2>
              <p className="text-xs text-gray-400 mb-6">Current distribution across all tasks</p>
              <DonutChart data={donutData} />
            </div>
          </div>

          {/* Priority split — Contribution Ranking section deleted (FD-03) */}
          <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
            <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Priority Split</h2>
            <p className="text-xs text-gray-400 mb-6">Distribution by urgency</p>
            <div className="flex flex-col gap-4 max-w-md">
              {priorityData.map(p => (
                <div key={p.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-gray-700 font-medium">{p.label}</span>
                    <span className="text-gray-400">{p.value} · {p.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${p.pct}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ TABULAR VIEW ═════════════════════════════ */}
      {view === 'tabular' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-gray-50 border-b border-gray-100">
            {['#', 'Task', 'Assignee', 'Priority', 'Status', 'Due'].map(h => (
              <span key={h} className="text-xs font-bold uppercase tracking-wide text-gray-400">{h}</span>
            ))}
          </div>

          {rankedTasks.map((t, i) => {
            const u = users.find(u => u.id === t.assigneeId)
            return (
              <div
                key={t.id}
                className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr] px-6 py-3.5 border-b border-gray-50 last:border-b-0 items-center hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-400 font-medium">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.state === 'done' ? 'Completed' : t.state === 'in_progress' ? 'In progress' : 'Not started'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: u.avatarColor, fontSize: 12 }}>
                      {u.initials}
                    </div>
                  )}
                  <span className="text-xs text-gray-500">{u?.name.split(' ')[0]}</span>
                </div>
                <PriorityBadge priority={t.priority} />
                <StateChip state={t.state} />
                <span className="text-xs text-gray-500">
                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
