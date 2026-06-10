'use client'
import { useState, useMemo, useEffect } from 'react'
import { useTasks } from '@/context/TasksContext'
import { Priority, TaskState } from '@/types'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip from '@/components/ui/StateChip'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

// ── Animated counter hook ──────────────────────────────────────────────
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    //if (!Number.isFinite(target) || target <= 0) { setValue(0); return }
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
          style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: '#8FA3B1' }}>
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

// ── Bar chart ──────────────────────────────────────────────────────────
function BarChart({ anaData, danData, labels }: {
  anaData: number[]
  danData: number[]
  labels:  string[]
}) {
  const maxVal = Math.max(...anaData, ...danData, 1)
  const H = 120

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-2 h-32">
        {labels.map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: H }}>
              <div
                className="flex-1 rounded-t-sm transition-all duration-700 bg-cr"
                style={{ height: `${(anaData[i] / maxVal) * H}px`, opacity: 0.85, minHeight: 2 }}
              />
              <div
                className="flex-1 rounded-t-sm transition-all duration-700"
                style={{ height: `${(danData[i] / maxVal) * H}px`, background: '#2980B9', opacity: 0.85, minHeight: 2 }}
              />
            </div>
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-cr" />
          <span className="text-gray-500">Ana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#2980B9' }} />
          <span className="text-gray-500">Dan</span>
        </div>
      </div>
    </div>
  )
}

export default function StatisticsPage() {
  const { tasks, users } = useTasks()
  const [view, setView] = useState<'visual' | 'tabular'>('visual')

  // ── Derived stats ──────────────────────────────────────────────────
  const total      = tasks.length
  const inProgress = tasks.filter(t => t.state === 'in_progress').length
  const done       = tasks.filter(t => t.state === 'done').length
  const overdue    = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.state !== 'done' && t.state !== 'cancelled'
  ).length

  const totalCount      = useCountUp(total)
  const completionRate  = useCountUp(total ? Math.round(done / total * 100) : 0)

  const recentCount = useMemo(() => {
    const cutoff = new Date().getTime() - THIRTY_DAYS_MS
    return tasks.filter(t => new Date(t.createdAt).getTime() > cutoff).length
  }, [tasks])

  const donutData = [
    { label: 'Done',        value: tasks.filter(t => t.state === 'done').length,        color: '#27AE60' },
    { label: 'In Progress', value: tasks.filter(t => t.state === 'in_progress').length,  color: '#2980B9' },
    { label: 'To Do',       value: tasks.filter(t => t.state === 'todo').length,         color: '#E74C3C' },
    { label: 'Cancelled',   value: tasks.filter(t => t.state === 'cancelled').length,    color: '#95A5A6' },
  ]

  const priorityData = [
    { label: '🔴 High',   value: tasks.filter(t => t.priority === 'high').length,   pct: total ? Math.round(tasks.filter(t => t.priority === 'high').length   / total * 100) : 0, color: '#C0392B' },
    { label: '🟡 Medium', value: tasks.filter(t => t.priority === 'medium').length, pct: total ? Math.round(tasks.filter(t => t.priority === 'medium').length / total * 100) : 0, color: '#F39C12' },
    { label: '🟢 Low',    value: tasks.filter(t => t.priority === 'low').length,    pct: total ? Math.round(tasks.filter(t => t.priority === 'low').length    / total * 100) : 0, color: '#27AE60' },
  ]

  // Per-user stats
  const userStats = users.map(u => {
    const mine      = tasks.filter(t => t.assigneeId === u.id)
    const doneCount = mine.filter(t => t.state === 'done').length
    const score     = mine.length ? Math.round((doneCount / Math.max(mine.length, 1)) * 5 * 10) / 10 : 0
    return { user: u, total: mine.length, done: doneCount, score: Math.min(score, 5) }
  })

  // Bar chart — monthly (simulated from seed dates)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May']
  const anaBar = [3, 5, 6, 4, 7]
  const danBar = [2, 4, 5, 5, 5]

  const monthlyData = useMemo(() => {
    const now = new Date()
    const u1 = users[0]?.id
    const u2 = users[1]?.id
    const buckets: { label: string; ana: number; dan: number }[] = []
    for (let i = 4; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const label = start.toLocaleDateString('en-US', { month: 'short' })
      let ana = 0, dan = 0
      for (const t of tasks) {
        if (t.state !== 'done') continue
        const d = new Date(t.updatedAt)
        if (d < start || d >= end) continue
        if (t.assigneeId === u1) ana++
        else if (t.assigneeId === u2) dan++
      }
      buckets.push({ label, ana, dan })
    }
    return buckets
  }, [tasks, users])

  // Ranked tasks for tabular view
  const rankedTasks = useMemo(() => {
    return [...tasks]
      .sort((a, b) => {
        const pMap: Record<Priority, number> = { high: 3, medium: 2, low: 1 }
        const sMap: Record<TaskState, number> = { done: 3, in_progress: 2, todo: 1, cancelled: 0 }
        return (pMap[b.priority] + sMap[b.state]) - (pMap[a.priority] + sMap[a.state])
      })
  }, [tasks])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="p-9">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Statistics</h1>
          <p className="text-xs text-gray-500">Workspace › Statistics › Tasks Overview</p>
        </div>
        {/* Toggle */}
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

      {/* ── Summary cards ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '✅', label: 'Total Tasks',      value: totalCount,     sub: `+${recentCount} this month`, up: true },
          { icon: '🎯', label: 'Completion Rate',  value: `${completionRate}%`, sub: '+12% vs last month', up: true },
          { icon: '⚠️', label: 'Overdue Tasks',    value: overdue,        sub: 'Need action',  up: false },
          { icon: '⚖️', label: 'Ana / Dan Split',  value: `${userStats[0]?.total ?? 0}/${userStats[1]?.total ?? 0}`, sub: 'Balanced', up: true },
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

            {/* Bar chart */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Tasks Completed</h2>
              <p className="text-xs text-gray-400 mb-6">Monthly comparison — Ana vs Dan</p>
              <BarChart anaData={monthlyData.map(m => m.ana)} danData={monthlyData.map(m => m.dan)} labels={monthlyData.map(m => m.label)} />
            </div>

            {/* Donut */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Status Breakdown</h2>
              <p className="text-xs text-gray-400 mb-6">Current distribution across all tasks</p>
              <DonutChart data={donutData} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Priority split */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Priority Split</h2>
              <p className="text-xs text-gray-400 mb-6">Distribution by urgency</p>
              <div className="flex flex-col gap-4">
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

            {/* Contribution ranking */}
            <div className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm lg:col-span-2">
              <h2 className="font-display text-lg font-semibold text-gray-800 mb-1">Contribution Ranking ⭐</h2>
              <p className="text-xs text-gray-400 mb-6">Based on tasks completed, on-time rate, and difficulty</p>
              <div className="flex flex-col gap-3">
                {[...userStats]
                  .sort((a, b) => b.score - a.score)
                  .map((s, i) => (
                    <div key={s.user.id} className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-b-0">
                      <span className="text-xl w-8">{medals[i] ?? `${i + 1}`}</span>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ background: s.user.avatarColor }}>
                        {s.user.initials}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-800">{s.user.name}</div>
                        <div className="text-xs text-gray-400">{s.done} done · {s.total} total</div>
                      </div>
                      <div className="flex gap-0.5 text-sm">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <span key={j} style={{ opacity: j < Math.round(s.score) ? 1 : 0.2 }}>⭐</span>
                        ))}
                      </div>
                      <span className="font-display text-lg font-bold text-gray-700 ml-2">{s.score.toFixed(1)}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ TABULAR VIEW ═════════════════════════════ */}
      {view === 'tabular' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-3 bg-gray-50 border-b border-gray-100">
            {['#', 'Task', 'Assignee', 'Priority', 'Status', 'Due', 'Score'].map(h => (
              <span key={h} className="text-xs font-bold uppercase tracking-wide text-gray-400">{h}</span>
            ))}
          </div>

          {rankedTasks.map((t, i) => {
            const u = users.find(u => u.id === t.assigneeId)
            const score = t.state === 'done' ? 5 : t.state === 'in_progress' ? 3 : t.state === 'cancelled' ? 0 : 2
            return (
              <div
                key={t.id}
                className="grid grid-cols-[40px_2fr_1fr_1fr_1fr_1fr_1fr] px-6 py-3.5 border-b border-gray-50 last:border-b-0 items-center hover:bg-gray-50 transition-colors"
              >
                <span className="text-base">{medals[i] ?? <span className="text-xs text-gray-400 font-medium">{i + 1}</span>}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.state === 'done' ? 'Completed' : t.state === 'in_progress' ? 'In progress' : 'Not started'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{ background: u.avatarColor, fontSize: 9 }}>
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
                <div className="flex gap-0.5 text-xs">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} style={{ opacity: j < score ? 1 : 0.2 }}>⭐</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
