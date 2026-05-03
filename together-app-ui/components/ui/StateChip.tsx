import { Task, TaskState } from "@/types"

const MAP: Record<TaskState, { label: string, cls: string }> = {
  todo:        { label: 'To Do',       cls: 'bg-gray-100  text-gray-600'  },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100  text-blue-700'  },
  done:        { label: 'Done ✓',      cls: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',   cls: 'bg-gray-100  text-gray-400'  },
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
