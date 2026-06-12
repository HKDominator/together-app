// ─────────────────────────────────────────────────────────────────────
// Destination: app/(app)/tasks/page.tsx
// Gold A2 changes from Silver:
//   1. Removed the <Pagination /> component at the bottom of the table.
//   2. Replaced manual per-page slicing with streaming: the backend
//      drives pages via `loadMore()`, we just render all `tasks` that
//      match the current client-side filters.
//   3. Added <div ref={prefetchRef}> ~1 page from the bottom and
//      <div ref={sentinelRef}> at the end. IntersectionObserver
//      triggers prefetch and loadMore respectively.
//   4. Footer line shows "N of M loaded" + loading spinner when fetching.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useState, useMemo, useEffect, MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { useTasks } from '@/context/TasksContext'
import { usePresence } from '@/context/PresenceContext'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip     from '@/components/ui/StateChip'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import PageWrapper   from '@/components/layout/PageWrapper'
import { Priority, Task, TaskState, ValidatedTaskData } from '@/types'
import { trackSearch, trackFilters, trackTask } from '@/lib/activity'

export default function TasksPage() {
  const router = useRouter()
  const {
    tasks, users, currentUser,
    createTask, updateTask, deleteTask,
    pendingCount, generatorRunning, startGenerator, stopGenerator,
    hasMore, totalTasks, isLoadingMore, loadMore, prefetchNext,
    lastCompletion,
    drainError, clearDrainError,
  } = useTasks()
  const { viewingByUser } = usePresence()
  const partner = users.find(u => u.id !== currentUser?.id)
  const partnerViewingTaskId = partner ? (viewingByUser[partner.id] ?? null) : null

  const [search,         setSearch]        = useState<string>('')
  const [searchResults,  setSearchResults] = useState<Task[] | null>(null)
  const [filterState,    setFilterState]   = useState<TaskState | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all')
  const [modalOpen,      setModalOpen]     = useState<boolean>(false)
  const [editingTask,    setEditingTask]   = useState<Task | null>(null)
  const [deleteId,       setDeleteId]      = useState<string | null>(null)
  const [generatorError, setGeneratorError] = useState<string | null>(null)

  useEffect(() => {
    trackFilters({ state: filterState, assignee: filterAssignee, priority: filterPriority })
  }, [filterState, filterAssignee, filterPriority])

  useEffect(() => {
    const t = setTimeout(() => { if (search) trackSearch(search) }, 600)
    return () => clearTimeout(t)
  }, [search])

  // BUG-35: server-side search so unloaded pages are included in results.
  useEffect(() => {
    if (!search) { setSearchResults(null); return }
    const t = setTimeout(async () => {
      try {
        const page = await api.listTasks({ search, perPage: 50 })
        setSearchResults(page.items)
      } catch { /* silently degrade to client-side filter */ }
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  const filtered = useMemo(() => {
    // When server results are available, use them (pre-filtered by title).
    // Otherwise fall back to the locally loaded pages with client-side title filter.
    const list = searchResults !== null ? searchResults : tasks
    return list.filter(t => {
      if (searchResults === null && search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterState    !== 'all' && t.state      !== filterState)    return false
      if (filterAssignee !== 'all' && t.assigneeId !== filterAssignee) return false
      if (filterPriority !== 'all' && t.priority   !== filterPriority) return false
      return true
    })
  }, [tasks, searchResults, search, filterState, filterAssignee, filterPriority])

  // ── Infinite scroll plumbing ───────────────────────────────────
  // Disabled when client-side filters are active — we can't know if
  // "more" pages will have matches without fetching them, and the
  // user-visible effect is the list looking shorter than expected.
  // Simple rule: only paginate while showing the unfiltered list.
  const anyFilterActive =
    !!search || filterState !== 'all' || filterAssignee !== 'all' || filterPriority !== 'all'

  const { sentinelRef, prefetchRef } = useInfiniteScroll({
    enabled:    !anyFilterActive && hasMore,
    onLoadMore: loadMore,
    onPrefetch: prefetchNext,
  })

  const total      = tasks.length
  const inProgress = tasks.filter(t => t.state === 'in_progress').length
  const done       = tasks.filter(t => t.state === 'done').length
  const overdue    = tasks.filter(t =>
    t.dueDate && new Date(t.dueDate) < new Date() &&
    t.state !== 'done' && t.state !== 'cancelled',
  ).length

  const findUser = (id: string) => users.find(u => u.id === id)
  const userName = (id: string) => users.find(u => u.id === id)?.name ?? '—'

  function openCreate() { setEditingTask(null); setModalOpen(true) }
  function openEdit(task: Task, e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation(); setEditingTask(task); setModalOpen(true)
  }

  async function handleSubmit(formData: ValidatedTaskData) {
    if (editingTask) await updateTask(editingTask.id, formData)
    else             await createTask(formData)
  }

  async function handleDelete() {
    if (!deleteId) return
    try { await deleteTask(deleteId) } finally { setDeleteId(null) }
  }

  function handleRowClick(id: string) { trackTask(id); router.push(`/tasks/${id}`) }

  async function toggleGenerator() {
    setGeneratorError(null)
    try {
      if (generatorRunning) await stopGenerator()
      else                  await startGenerator()
    } catch (e) {
      setGeneratorError(`Generator error: ${(e as Error).message}`)
    }
  }

  function clearAllFilters() {
    setSearch('')
    setFilterState('all')
    setFilterAssignee('all')
    setFilterPriority('all')
  }

  // Prefetch sentinel goes just above the real sentinel — in practice
  // we want the prefetch to fire roughly one page-height before the
  // load-more sentinel, so we slot it a bit earlier in the list.
  const prefetchIndex = Math.max(0, filtered.length - 10)

  return (
    <PageWrapper>
      <div className="p-9">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-sl mb-1 flex items-center gap-3">
              Tasks
              {pendingCount > 0 && (
                <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                  {pendingCount} pending sync
                </span>
              )}
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={toggleGenerator}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold motion-safe:transition-all motion-safe:hover:-translate-y-0.5
                ${generatorRunning
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-white text-sl border border-gray-200 hover:border-cr'}`}
            >
              {generatorRunning ? '■ Stop generator' : '▶ Generate'}
            </button>

            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-semibold motion-safe:transition-all motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-95 bg-cr"
              style={{ boxShadow: '0 3px 12px rgba(192,57,43,0.3)' }}
            >
              + New Task
            </button>
          </div>
        </div>

        {drainError && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-center justify-between">
            {drainError}
            <button onClick={clearDrainError} className="ml-3 text-xs underline">Dismiss</button>
          </div>
        )}

        {generatorError && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center justify-between">
            {generatorError}
            <button onClick={() => setGeneratorError(null)} className="ml-3 text-xs underline">Dismiss</button>
          </div>
        )}

        {/* ── Summary strip ──────────────────────────────── */}
        {(total > 0 || totalTasks > 0) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mb-7 text-sm">
            <span className="text-sl-muted">{totalTasks > 0 ? totalTasks : total} tasks total</span>
            {inProgress > 0 && <span className="text-sl-muted">{inProgress} in progress</span>}
            {done > 0 && <span className="text-sl-muted">{done} done</span>}
            {overdue > 0 && <span className="font-semibold text-warning">{overdue} overdue</span>}
          </div>
        )}

        {/* ── Filters ────────────────────────────────── */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-sl-dim">🔍</span>
            <input
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-sl placeholder:text-sl-muted outline-none focus:border-cr focus:ring-2 focus:ring-cr-pale"
            />
          </div>
          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-sl outline-none focus:border-cr"
          >
            <option value="all">All assignees</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as Priority | 'all')}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-sl outline-none focus:border-cr"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {(['all', 'todo', 'in_progress', 'done', 'cancelled'] as (TaskState | 'all')[]).map(s => (
            <button
              key={s}
              onClick={() => setFilterState(s)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold motion-safe:transition-all border
                ${filterState === s
                  ? 'bg-cr-pale border-cr text-cr'
                  : 'bg-white border-gray-200 text-sl-muted hover:border-cr hover:text-cr'}`}
            >
              {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Table + infinite scroll ─────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[2fr_1fr_100px_110px_100px_80px] px-6 py-3 bg-bg border-b border-gray-100">
              {['Task', 'Assignee', 'Priority', 'Due Date', 'Status', ''].map(h => (
                <span key={h} className="text-xs font-bold uppercase tracking-wide text-sl-dim">{h}</span>
              ))}
            </div>

            {filtered.length === 0 ? (
              anyFilterActive ? (
                <div className="px-6 py-16 text-center text-sl-muted text-sm">
                  <p>No tasks match your filters.</p>
                  <button
                    onClick={clearAllFilters}
                    className="mt-3 text-cr text-xs font-semibold underline-offset-2 hover:underline"
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="px-6 py-16 text-center text-sl-muted text-sm">
                  Nothing here yet — add your first task together.
                </div>
              )
            ) : (
              filtered.map((t, i) => {
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.state !== 'done' && t.state !== 'cancelled'
                const u = findUser(t.assigneeId)
                const isOptimistic = t.id.startsWith('tmp_')
                const isPrefetchRow = !anyFilterActive && i === prefetchIndex
                return (
                  <div
                    key={t.id}
                    role="row"
                    tabIndex={0}
                    onClick={() => handleRowClick(t.id)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleRowClick(t.id)}
                    className={`grid grid-cols-[2fr_1fr_100px_110px_100px_80px] px-6 py-3.5 border-b border-gray-50
                      items-center cursor-pointer motion-safe:transition-colors hover:bg-cm-pale last:border-b-0
                      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cr focus-visible:ring-inset
                      ${isOverdue ? 'bg-red-50/30' : ''}
                      ${isOptimistic ? 'opacity-60' : ''}`}
                  >
                    <div className="relative">
                      {isPrefetchRow && <div ref={prefetchRef} className="absolute inset-0 pointer-events-none" />}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-sl truncate max-w-xs">
                          {t.title}
                          {isOptimistic && <span className="ml-2 text-xs text-amber-600">· syncing</span>}
                        </p>
                        {/* FD-06: partner is looking at this task right now */}
                        {partnerViewingTaskId === t.id && partner && (
                          <span
                            role="img"
                            aria-label={`${partner.name} is viewing this task`}
                            title={`${partner.name} is viewing this task`}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white shrink-0"
                            style={{ background: partner.avatarColor, fontSize: 11 }}
                          >
                            {partner.initials}
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <p className={`text-xs truncate max-w-xs mt-0.5 ${isOverdue ? 'text-red-700' : 'text-sl-muted'}`}>{t.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {u && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: u.avatarColor, fontSize: 12 }}>
                          {u.initials}
                        </div>
                      )}
                      <span className="text-xs text-sl-muted">
                        {t.assigneeId === currentUser?.id ? 'You' : userName(t.assigneeId)}
                      </span>
                    </div>
                    <PriorityBadge priority={t.priority} />
                    <span className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-sl-muted'}`}>
                      {isOverdue && '⚠ '}
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    </span>
                    <span
                      className={`rounded-full motion-safe:transition-all motion-safe:duration-300 ${lastCompletion?.taskId === t.id ? 'ring-2 ring-amber-400' : ''}`}
                      data-testid={`row-chip-${t.id}`}
                    >
                      <StateChip state={t.state} />
                    </span>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => openEdit(t, e)}
                        className="p-1.5 rounded-md text-sl-dim hover:text-cr hover:bg-cr-pale motion-safe:transition-colors text-sm"
                        aria-label="Edit task"
                      >✎</button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteId(t.id) }}
                        className="p-1.5 rounded-md text-sl-dim hover:text-red-600 hover:bg-red-50 motion-safe:transition-colors text-sm"
                        aria-label="Delete task"
                      >🗑</button>
                    </div>
                  </div>
                )
              })
            )}

            {/* Footer — loading state + sentinel */}
            <div className="px-6 py-4 text-center text-xs text-sl-dim border-t border-gray-100 bg-bg">
              {anyFilterActive ? (
                <span>Showing {filtered.length} filtered result{filtered.length === 1 ? '' : 's'} from {tasks.length} loaded</span>
              ) : isLoadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-3 h-3 border-2 border-gray-300 border-t-cr rounded-full animate-spin" />
                  Loading more…
                </span>
              ) : hasMore ? (
                <span>Scroll to load more · {tasks.length} of {totalTasks}</span>
              ) : (
                <span>All {tasks.length} tasks loaded ✓</span>
              )}
            </div>
          </div>

          {/* Load-more sentinel — IntersectionObserver watches this */}
          <div ref={sentinelRef} aria-hidden className="h-1" />
        </div>

        <TaskFormModal
          isOpen={modalOpen}
          task={editingTask}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />

        {deleteId && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-enter"
            style={{ background: 'rgba(26,37,51,0.55)', backdropFilter: 'blur(4px)' }}
          >
            <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl modal-enter">
              <h3 className="font-display text-xl font-bold text-sl mb-3">Delete this task?</h3>
              <p className="text-sm text-sl-muted mb-7">
                <strong className="text-sl">&ldquo;{tasks.find(t => t.id === deleteId)?.title ?? 'this task'}&rdquo;</strong>{' '}
                will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteId(null)}
                  className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-sl hover:bg-gray-50 motion-safe:transition-colors"
                >Keep Task</button>
                <button
                  onClick={handleDelete}
                  className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 motion-safe:transition-colors"
                >Delete Task</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
