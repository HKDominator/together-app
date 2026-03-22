'use client'
import { Task, TaskState, State } from '@/types'
import { createContext, Dispatch, ReactNode, useContext, useReducer } from 'react'

interface TasksContextValue extends State {
  dispatch: Dispatch<Action>
}

export type Action = 
  | { type: 'ADD_TASK', payload: Omit<Task, 'id' | 'state' | 'createdAt' | 'updatedAt' | 'createdById'> }
  | { type: 'UPDATE_TASK', payload: { id: string, changes: Partial<Task> } }
  | { type: 'DELETE_TASK', payload: { id: string } }
  | { type: 'SET_STATE', payload: { id: string, newState: TaskState } }

// ── Users ────────────────────────────────────────────────────────────
export const USERS = [
  { id: 'u1', name: 'Ana Pop',      role: 'owner',   avatarColor: '#C0392B', initials: 'AP' },
  { id: 'u2', name: 'Dan Ionescu',  role: 'partner', avatarColor: '#2980B9', initials: 'DI' },
]

// ── State machine ─────────────────────────────────────────────────────
export const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  todo:        ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   [],
}

// ── Seed data ─────────────────────────────────────────────────────────
const SEED: Task[] = [
  { id: 't1', title: 'Book restaurant for anniversary 💍', description: 'Reserve table at Maison, confirm vegetarian menu option and request window table.',   assigneeId: 'u1', createdById: 'u1', priority: 'high',   state: 'todo',        dueDate: '2026-04-12', createdAt: new Date('2026-03-08'), updatedAt: new Date('2026-03-08') },
  { id: 't2', title: 'Renew car insurance',                description: 'Compare quotes on Generali and Allianz before the renewal deadline.',                  assigneeId: 'u2', createdById: 'u1', priority: 'high',   state: 'in_progress', dueDate: '2026-04-20', createdAt: new Date('2026-03-05'), updatedAt: new Date('2026-03-10') },
  { id: 't3', title: 'Plan Lisbon trip itinerary ✈️',       description: 'Day-by-day plan for the April long weekend trip.',                                    assigneeId: 'u1', createdById: 'u1', priority: 'medium', state: 'todo',        dueDate: '2026-04-02', createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01') },
  { id: 't4', title: 'Buy birthday gift for Mum',          description: 'She mentioned wanting a cookbook. Check Humanitas or order online.',                   assigneeId: 'u1', createdById: 'u2', priority: 'medium', state: 'todo',        dueDate: '2026-04-22', createdAt: new Date('2026-03-12'), updatedAt: new Date('2026-03-12') },
  { id: 't5', title: 'Update apartment rental contract',   description: 'Send signed copy to landlord by end of month.',                                       assigneeId: 'u2', createdById: 'u1', priority: 'high',   state: 'done',        dueDate: '2026-03-31', createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-28') },
  { id: 't6', title: 'Weekly grocery run 🛒',              description: "Don't forget oat milk and coffee pods.",                                               assigneeId: 'u1', createdById: 'u1', priority: 'low',    state: 'done',        dueDate: '2026-03-15', createdAt: new Date('2026-03-13'), updatedAt: new Date('2026-03-15') },
  { id: 't7', title: 'Set up emergency savings goal',      description: 'Open joint savings account, first transfer by Mar 30.',                               assigneeId: 'u2', createdById: 'u2', priority: 'medium', state: 'todo',        dueDate: '2026-03-30', createdAt: new Date('2026-03-01'), updatedAt: new Date('2026-03-01') },
  { id: 't8', title: 'Gym membership renewal',             description: 'Check if the Together discount is still valid.',                                       assigneeId: 'u2', createdById: 'u2', priority: 'low',    state: 'in_progress', dueDate: '2026-04-15', createdAt: new Date('2026-03-10'), updatedAt: new Date('2026-03-10') },
  { id: 't9', title: 'Fix the bathroom tap',               description: 'Call the plumber or check if it can be DIY fixed.',                                   assigneeId: 'u2', createdById: 'u1', priority: 'medium', state: 'cancelled',   dueDate: null,         createdAt: new Date('2026-03-02'), updatedAt: new Date('2026-03-05') },
]

function makeId() {
  return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ── Reducer ───────────────────────────────────────────────────────────
export function tasksReducer(state: State, action: Action): State {
  switch (action.type) {

    case 'ADD_TASK': {
      const task = {
        ...action.payload,
        id:          makeId(),
        state:       'todo' as TaskState,
        createdAt:   new Date(),
        updatedAt:   new Date(),
        createdById: state.currentUser.id,
      }
      return { ...state, tasks: [...state.tasks, task] }
    }

    case 'UPDATE_TASK': {
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? {
                ...t,
                ...action.payload.changes,
                // these fields must never be overwritten
                id:          t.id,
                createdAt:   t.createdAt,
                createdById: t.createdById,
                updatedAt:   new Date(),
              }
            : t
        ),
      }
    }

    case 'DELETE_TASK': {
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload.id) }
    }

    case 'SET_STATE': {
      const task = state.tasks.find(t => t.id === action.payload.id)
      if (!task) return state
      const allowed = VALID_TRANSITIONS[task.state] ?? []
      if (!allowed.includes(action.payload.newState)) return state
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload.id
            ? { ...t, state: action.payload.newState, updatedAt: new Date() }
            : t
        ),
      }
    }

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────────────────────
const TasksContext = createContext<TasksContextValue | null>(null)

const INITIAL = {
  tasks:       SEED,
  users:       USERS,
  currentUser: USERS[0],
}

export function TasksProvider({ children } : { children: ReactNode }) {
  const [state, dispatch] = useReducer(tasksReducer, INITIAL as State)
  return (
    <TasksContext.Provider value={{ ...state, dispatch }}>
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>')
  return ctx
}
