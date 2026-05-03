// Domain enums, kept in sync with the frontend's types/index.ts.
// Using literal string unions is intentional — these match the Next.js
// client's type declarations verbatim so serialised JSON is identical.

export enum Priority {
  HIGH   = 'high',
  MEDIUM = 'medium',
  LOW    = 'low',
}

export enum TaskState {
  TODO        = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE        = 'done',
  CANCELLED   = 'cancelled',
}

/**
 * Allowed state transitions. Mirrors the frontend's VALID_TRANSITIONS
 * in `context/TasksContext.tsx`. The backend is authoritative — the
 * frontend's state machine is for UX (hide invalid buttons) but this
 * is the one that actually enforces.
 */
export const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.TODO]:        [TaskState.IN_PROGRESS, TaskState.CANCELLED],
  [TaskState.IN_PROGRESS]: [TaskState.DONE,        TaskState.CANCELLED],
  [TaskState.DONE]:        [],
  [TaskState.CANCELLED]:   [],
}

export interface Task {
  id:          string
  title:       string
  description: string
  assigneeId:  string
  createdById: string
  priority:    Priority
  state:       TaskState
  dueDate:     string | null      // ISO date string "YYYY-MM-DD" | null
  createdAt:   string              // ISO timestamp
  updatedAt:   string              // ISO timestamp
}
