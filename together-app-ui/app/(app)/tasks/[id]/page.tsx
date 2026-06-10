// ─────────────────────────────────────────────────────────────────────
// Destination: app/(app)/tasks/[id]/page.tsx
// Gold A2 change: renders <CommentsThread taskId={task.id} /> below
// the Activity section inside the main task card. Only the import
// and the one JSX line are new; everything else is the Silver version.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { ReactNode, use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTasks, VALID_TRANSITIONS } from '@/context/TasksContext'
import PriorityBadge from '@/components/ui/PriorityBadge'
import StateChip     from '@/components/ui/StateChip'
import TaskFormModal from '@/components/tasks/TaskFormModal'
import CommentsThread from '@/components/tasks/CommentsThread'
import { TaskState, User, ValidatedTaskData } from '@/types'

const STATE_ORDER: TaskState[] = ['todo', 'in_progress', 'done']

interface Props { params: Promise<{ id: string }> }

export default function TaskDetailPage({ params }: Props) {
  const { id } = use(params)
  const router = useRouter()
  const { tasks, users, updateTask, deleteTask, setTaskState } = useTasks()

  const task = tasks.find(t => t.id === id)

  const [editOpen,   setEditOpen]   = useState<boolean>(false)
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false)

  if (!task) {
    return (
      <div className="p-9 text-center">
        <p className="text-gray-500 text-sm mb-4">Task not found.</p>
        <button onClick={() => router.push('/tasks')} className="text-blue-600 text-sm font-semibold hover:underline">
          ← Back to Tasks
        </button>
      </div>
    )
  }

  const assignee   = users.find(u => u.id === task.assigneeId)
  const createdBy  = users.find(u => u.id === task.createdById)
  const allowed    = VALID_TRANSITIONS[task.state] ?? []
  const isTerminal = allowed.length === 0
  const isOverdue  = task.dueDate
    && new Date(task.dueDate) < new Date()
    && task.state !== 'done' && task.state !== 'cancelled'
  const stateIndex = STATE_ORDER.indexOf(task.state)

  async function transition(newState: TaskState) {
    try { await setTaskState(task!.id, newState) } catch (err) { console.error(err) }
  }
  async function handleEdit(formData: ValidatedTaskData) {
    try { await updateTask(task!.id, formData) } catch (err) { console.error(err) }
  }
  async function handleDelete() {
    try { await deleteTask(task!.id); router.push('/tasks') } catch (err) { console.error(err) }
  }
  async function handleReassign(userId: string) {
    try { await updateTask(task!.id, { assigneeId: userId }) } catch (err) { console.error(err) }
  }

  const fmtDate = (d: Date | string | null | undefined): string => d
    ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <div className="p-9">
      <button
        onClick={() => router.push('/tasks')}
        className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 transition-colors mb-6"
      >
        ← Back to Tasks
      </button>

      <div className="grid grid-cols-[1fr_320px] gap-6">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-9">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <StateChip state={task.state} />
            {isOverdue && <span className="text-xs text-red-600 font-semibold">⚠ Overdue</span>}
          </div>

          <h1 className="font-display text-2xl font-bold text-gray-700 mb-4">{task.title}</h1>

          {task.description && (
            <div className="bg-cm-pale rounded-lg px-5 py-4 text-sm text-gray-500 leading-relaxed mb-8">
              {task.description}
            </div>
          )}

          <p className="text-xs font-semibold text-gray-500 mb-4 flex items-center gap-2">
            State Flow
            <span className="flex-1 h-px bg-gray-100" />
          </p>

          <div className="flex items-center gap-2 mb-8">
            {STATE_ORDER.map((s, i) => {
              const isPast    = i < stateIndex
              const isCurrent = i === stateIndex
              const isFuture  = i > stateIndex
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm border-2 transition-colors
                      ${isPast    ? 'bg-green-500 border-green-500 text-white'   : ''}
                      ${isCurrent ? 'bg-blue-500  border-blue-500  text-white'   : ''}
                      ${isFuture  ? 'bg-white      border-gray-200  text-gray-300' : ''}
                      ${task.state === 'cancelled' && s === 'done' ? 'opacity-30' : ''}
                    `}>
                      {isPast ? '✓' : isCurrent ? '●' : '○'}
                    </div>
                    <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                      {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                    </span>
                  </div>
                  {i < STATE_ORDER.length - 1 && (
                    <div className={`w-12 h-0.5 mb-5 ${isPast ? 'bg-green-400' : 'bg-gray-200'}`} />
                  )}
                </div>
              )
            })}

            {task.state === 'cancelled' && (
              <div className="ml-4 flex flex-col items-center gap-1.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-gray-200 text-sm bg-gray-100 text-gray-400">✕</div>
                <span className="text-xs text-gray-500 uppercase tracking-wide font-medium">Cancelled</span>
              </div>
            )}
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-4 flex items-center gap-2">
            Actions
            <span className="flex-1 h-px bg-gray-100" />
          </p>

          <div className="flex flex-wrap gap-2 mb-8">
            {allowed.includes('in_progress') && <ActionBtn color="blue"    onClick={() => transition('in_progress')}>▶ Start Task</ActionBtn>}
            {allowed.includes('done')        && <ActionBtn color="green"   onClick={() => transition('done')}>✓ Mark Done</ActionBtn>}
            {allowed.includes('cancelled')   && <ActionBtn color="gray"    onClick={() => transition('cancelled')}>✕ Cancel</ActionBtn>}
            {!isTerminal                     && <ActionBtn color="crimson" onClick={() => setEditOpen(true)}>✎ Edit Task</ActionBtn>}
                                                <ActionBtn color="red"     onClick={() => setDeleteOpen(true)}>🗑 Delete</ActionBtn>
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-4 flex items-center gap-2">
            Activity
            <span className="flex-1 h-px bg-gray-100" />
          </p>

          <div className="space-y-3">
            <ActivityItem user={createdBy} action="created this task" time={task.createdAt} />
            {new Date(task.createdAt).getTime() !== new Date(task.updatedAt).getTime() && (
              <ActivityItem user={assignee} action="last updated this task" time={task.updatedAt} />
            )}
          </div>

          {/* ── Gold: comments thread ──────────────── */}
          <CommentsThread taskId={task.id} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-500 mb-4">Task Details</p>
            <DetailRow label="Assigned to">
              <div className="flex items-center gap-2">
                {assignee && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: assignee.avatarColor, fontSize: 8 }}>
                    {assignee.initials}
                  </div>
                )}
                <span className="text-sm text-gray-700 font-medium">{assignee?.name ?? '—'}</span>
              </div>
            </DetailRow>
            <DetailRow label="Due Date">
              <span className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                {isOverdue && '⚠ '}{fmtDate(task.dueDate)}
              </span>
            </DetailRow>
            <DetailRow label="Priority"><PriorityBadge priority={task.priority} /></DetailRow>
            <DetailRow label="Status"><StateChip state={task.state} /></DetailRow>
            <DetailRow label="Created"><span className="text-sm text-gray-700">{fmtDate(task.createdAt)}</span></DetailRow>
          </div>

          {!isTerminal && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold text-gray-500 mb-3">Re-assign</p>
              <p className="text-xs text-gray-500 mb-3">Transfer this task to your partner</p>
              {users.filter(u => u.id !== task.assigneeId).map(u => (
                <button
                  key={u.id}
                  onClick={() => handleReassign(u.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-crimson text-sm text-gray-700 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: u.avatarColor, fontSize: 9 }}>
                    {u.initials}
                  </div>
                  Assign to {u.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskFormModal
        isOpen={editOpen}
        task={task}
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
      />

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(26,37,51,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="bg-white rounded-3xl p-10 w-full max-w-sm shadow-2xl">
            <h3 className="font-display text-xl font-bold text-gray-700 mb-3">Delete this task?</h3>
            <p className="text-sm text-gray-500 mb-7">
              <strong className="text-gray-700">{task.title}</strong> will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >Keep Task</button>
              <button
                onClick={handleDelete}
                className="px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >Yes, Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ActionBtn ─────────────────────────────────────────────────────────
type ActionBtnColor = 'blue' | 'green' | 'gray' | 'crimson' | 'red'

const ACTION_BTN_MAP: Record<ActionBtnColor, string> = {
  blue:    'bg-blue-50   text-blue-700  hover:bg-blue-100',
  green:   'bg-green-50  text-green-700 hover:bg-green-100',
  gray:    'bg-gray-100  text-gray-500  hover:bg-gray-200',
  crimson: 'bg-cr-pale   text-cr        hover:bg-red-100',
  red:     'bg-red-50    text-red-700   hover:bg-red-100',
}

interface ActionBtnProps { children: ReactNode; onClick: () => void | Promise<void>; color: ActionBtnColor }
function ActionBtn({ children, onClick, color }: ActionBtnProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${ACTION_BTN_MAP[color]}`}
    >
      {children}
    </button>
  )
}

interface DetailRowProps { label: string; children: ReactNode }
function DetailRow({ label, children }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      {children}
    </div>
  )
}

interface ActivityItemProps { user: User | undefined; action: string; time: Date | string | undefined }
function ActivityItem({ user, action, time }: ActivityItemProps) {
  if (!user) return null
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white flex-shrink-0 mt-0.5"
        style={{ background: user.avatarColor, fontSize: 9 }}>
        {user.initials}
      </div>
      <div>
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{user.name}</span> {action}
        </p>
        <p className="text-xs text-gray-500">
          {time ? new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
        </p>
      </div>
    </div>
  )
}
