import { Priority } from "@/types"

const MAP: Record<Priority, { label: string, cls: string }> = {
  high:   { label: 'High',   cls: 'bg-red-100    text-red-700'    },
  medium: { label: 'Medium', cls: 'bg-yellow-100 text-yellow-700' },
  low:    { label: 'Low',    cls: 'bg-green-100  text-green-700'  },
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
