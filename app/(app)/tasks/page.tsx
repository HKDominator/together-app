'use client'
import { useState, useMemo, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useTasks } from '@/context/TasksContext'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip     from '@/components/ui/StateChip'
import Pagination    from '@/components/ui/Pagination'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import { Priority, Task, TaskState, TaskFormData } from '@/types'

const PER_PAGE = 8

export default function TasksPage() {
  const router = useRouter()
  const { tasks, users, dispatch } = useTasks()

  // ── Local UI state ────────────────────────────────────
  const [page,           setPage]          = useState<number>(1)
  const [search,         setSearch]        = useState<string>('')
  const [filterState,    setFilterState]   = useState<TaskState | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [modalOpen,      setModalOpen]     = useState<boolean>(false)
  const [editingTask,    setEditingTask]   = useState<Task | null>(null)
  const [deleteId,       setDeleteId]      = useState<string | null>(null)

  // ── Derived data ──────────────────────────────────────
  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (search        && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterState   !== 'all' && t.state    !== filterState)    return false
      if (filterAssignee !== 'all' && t.assigneeId !== filterAssignee) return false
      if (filterPriority !== 'all' && t.priority  !== filterPriority)  return false
      return true
    })
  }, [tasks, search, filterState, filterAssignee, filterPriority])

  const paginated = useMemo(() => {
    const start = (page - 1) * PER_PAGE
    return filtered.slice(start, start + PER_PAGE)
  }, [filtered, page])

  // Reset to page 1 whenever filters change
  function applyFilter<T>(setter: (value: T) => void, value: T) {
    setter(value)
    setPage(1)
  }

  // ── Stats ─────────────────────────────────────────────
  const total      = tasks.length
  const inProgress = tasks.filter(t => t.state === 'in_progress').length
  const done       = tasks.filter(t => t.state === 'done').length
  const overdue    = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.state !== 'done' && t.state !== 'cancelled').length

  // ── Helpers ───────────────────────────────────────────
  const userName = (id: string) => users.find(u => u.id === id)?.name ?? '—'
 
  const findUser = (id: string) => users.find(u => u.id === id)
  function openCreate() { setEditingTask(null); setModalOpen(true) }
  function openEdit(task: Task, e: MouseEvent<HTMLButtonElement>) { e.stopPropagation(); setEditingTask(task); setModalOpen(true) }

  function handleSubmit(formData : TaskFormData) {
    const payload = {
      ...formData,
      priority: formData.priority as Priority,
    }
    
    if (editingTask) {
      dispatch({ type: 'UPDATE_TASK', payload: { id: editingTask.id, changes: payload } })
    } else {
      dispatch({ type: 'ADD_TASK', payload: payload })
    }
  }

  function handleDelete() {
    if(!deleteId) return
    dispatch({ type: 'DELETE_TASK', payload: { id: deleteId } })
    setDeleteId(null)
  }

  return (
    <div className="p-9">

      {/* ── Page header ────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-800 mb-1">Tasks</h1>
          <p className="text-xs text-gray-500">Workspace › Tasks › All</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold transition-all hover:-translate-y-0.5"
          style={{ background: '#C0392B', boxShadow: '0 3px 12px rgba(192,57,43,0.3)' }}
        >
          ＋ New Task
        </button>
      </div>

      {/* ── Stat cards ─────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4 mb-7">
        {[
          { label: 'Total',       value: total,      sub: 'tasks in workspace',  barW: '100%', barC: '#C0392B' },
          { label: 'In Progress', value: inProgress,  sub: 'being worked on',     barW: `${Math.round(inProgress/total*100)||0}%`, barC: '#2980B9' },
          { label: 'Done',        value: done,        sub: 'completed',           barW: `${Math.round(done/total*100)||0}%`,       barC: '#27AE60' },
          { label: 'Overdue',     value: overdue,     sub: 'need attention',      barW: `${Math.round(overdue/total*100)||0}%`,    barC: '#E74C3C' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{s.label}</p>
            <p className="font-display text-3xl font-bold text-gray-800 leading-none mb-1">{s.value}</p>
            <p className="text-xs text-gray-500 mb-3">{s.sub}</p>
            <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: s.barW, background: s.barC }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={e => applyFilter(setSearch, e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-cr focus:ring-2 focus:ring-cr-pale"
          />
        </div>

        {/* Assignee */}
        <select
          value={filterAssignee}
          onChange={e => applyFilter(setFilterAssignee, e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cr"
        >
          <option value="all">All assignees</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        {/* Priority */}
        <select
          value={filterPriority}
          onChange={e => applyFilter(setFilterPriority, e.target.value as Priority | 'all')}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-cr"
        >
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* State chips */}
        {(['all', 'todo', 'in_progress', 'done', 'cancelled'] as (TaskState | 'all')[]).map(s => (
          <button
            key={s}
            onClick={() => applyFilter(setFilterState, s)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold transition-all border
              ${filterState === s
                ? 'bg-cr-pale border-cr text-cr'
                : 'bg-white border-gray-200 text-gray-500 hover:border-cr hover:text-cr'
              }`}
          >
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_100px_110px_100px_80px] px-6 py-3 bg-gray-50 border-b border-gray-100">
          {['Task', 'Assignee', 'Priority', 'Due Date', 'Status', ''].map(h => (
            <span key={h} className="text-xs font-bold uppercase tracking-wide text-gray-600">{h}</span>
          ))}
        </div>

        {/* Rows */}
        {paginated.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500 text-sm">
            No tasks match your filters.
          </div>
        ) : (
          paginated.map(t => {
            const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.state !== 'done' && t.state !== 'cancelled'
            const u = findUser(t.assigneeId)
            return (
              <div
                key={t.id}
                onClick={() => router.push(`/tasks/${t.id}`)}
                className={`grid grid-cols-[2fr_1fr_100px_110px_100px_80px] px-6 py-3.5 border-b border-gray-50
                  items-center cursor-pointer transition-colors hover:bg-cm-pale last:border-b-0
                  ${isOverdue ? 'bg-red-50/30' : ''}`}
              >
                {/* Title */}
                <div>
                  <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{t.title}</p>
                  {t.description && (
                    <p className="text-xs text-gray-500 truncate max-w-xs mt-0.5">{t.description}</p>
                  )}
                </div>

                {/* Assignee */}
                <div className="flex items-center gap-2">
                  {u && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                      style={{ background: u.avatarColor, fontSize: 9 }}>
                      {u.initials}
                    </div>
                  )}
                  <span className="text-xs text-gray-600">{userName(t.assigneeId)}</span>
                </div>

                {/* Priority */}
                <PriorityBadge priority={t.priority} />

                {/* Due date */}
                <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                  {isOverdue && '⚠ '}
                  {t.dueDate
                    ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : '—'}
                </span>

                {/* State */}
                <StateChip state={t.state} />

                {/* Actions */}
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={e => openEdit(t, e)}
                    className="p-1.5 rounded-md text-gray-500 hover:text-cr hover:bg-cr-pale transition-colors text-sm"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                    className="p-1.5 rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors text-sm"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })
        )}

        <Pagination
          page={page}
          totalItems={filtered.length}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </div>

      {/* ── Create / Edit modal ─────────────────────── */}
      <TaskFormModal
        key={editingTask?.id || 'new'} // Reset form when switching between tasks
        isOpen={modalOpen}
        task={editingTask}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* ── Delete confirm ──────────────────────────── */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,37,51,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl">
            <h3 className="font-display text-xl font-bold text-gray-700 mb-3">Delete this task?</h3>
            <p className="text-sm text-gray-500 mb-7">
              <strong className="text-gray-700">&ldquo;{tasks.find(t => t.id === deleteId)?.title}&rdquo;</strong>{' '}
              will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteId(null)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Keep Task
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
