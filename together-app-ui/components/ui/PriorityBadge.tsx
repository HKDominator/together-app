import { Priority } from "@/types"

const MAP: Record<Priority, { label: string, cls: string }> = {
  high:   { label: 'High',   cls: 'bg-danger-pale text-danger'   },
  medium: { label: 'Medium', cls: 'bg-warning-pale text-warning' },
  low:    { label: 'Low',    cls: 'bg-success-pale text-success' },
}

interface Props {
  priority: Priority
}

export default function PriorityBadge({ priority }: Props) {
  const { label, cls } = MAP[priority] ?? MAP.low
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
