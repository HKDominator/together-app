import { Task, TaskState } from "@/types"

const MAP: Record<TaskState, { label: string, cls: string }> = {
  todo:        { label: 'To Do',       cls: 'bg-bg text-sl-muted'         },
  in_progress: { label: 'In Progress', cls: 'bg-info-pale text-info'       },
  done:        { label: 'Done ✓',      cls: 'bg-success-pale text-success' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-bg text-sl-muted'          },
}

interface Props{
  state: TaskState
}

export default function StateChip({ state } : Props) {
  const { label, cls } = MAP[state] ?? MAP.todo
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
