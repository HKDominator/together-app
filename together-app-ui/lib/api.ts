// ─────────────────────────────────────────────────────────────────────
// Destination: lib/api.ts
// Gold A2 changes:
//   1. Added comment CRUD methods (REST).
//   2. Added `graphql()` helper — a minimal fetch wrapper around
//      POST /graphql so you can demo the Gold GraphQL surface from
//      the client (or from DevTools) without pulling in Apollo.
//
// The rest of this file is identical to the Silver version.
// ─────────────────────────────────────────────────────────────────────
import type {
  Comment,
  Task,
  TaskState,
  Priority,
  User,
  ValidatedTaskData,
} from '@/types'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
// GraphQL is at /graphql (no /api prefix — main.ts only prefixes REST).
export const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? 'http://localhost:3001/graphql'

// ── Errors ───────────────────────────────────────────────────────────
export class NetworkError extends Error {
  constructor(message = 'Network unreachable') { super(message); this.name = 'NetworkError' }
}
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = 'ApiError' }
}

// ── Response shapes ──────────────────────────────────────────────────
export interface Paginated<T> {
  items:      T[]
  total:      number
  page:       number
  perPage:    number
  totalPages: number
}

export interface TopCommentedTask { taskId: string; title: string; count: number }

export interface TasksStats {
  total:             number
  byState:           Record<TaskState, number>
  byPriority:        Record<Priority, number>
  byUser:            { userId: string; total: number; done: number }[]
  overdue:           number
  completionRate:    number
  recentCount:       number
  topCommentedTasks: TopCommentedTask[]
}

// Single-flight refresh: if one is already in-flight, all 401s share it.
let _refreshFlight: Promise<boolean> | null = null
function refreshOnce(): Promise<boolean> {
  if (!_refreshFlight) {
    _refreshFlight = fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { _refreshFlight = null })
  }
  return _refreshFlight
}

async function req<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path:   string,
  body?:  unknown,
  retry = true,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body:    body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch { throw new NetworkError() }

  if (res.status === 401 && retry) {
    const refreshed = await refreshOnce()
    if (refreshed) return req<T>(method, path, body, false)
    // Refresh failed → session is dead. Tell the world.
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
  }

  if (res.status === 204) return undefined as T
  if (!res.ok) {
    let detail = res.statusText
    try {
      const b = await res.json()
      detail = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? detail)
    } catch { /* not JSON */ }
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

function qs(params: object): string {
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') u.append(k, String(v))
  }
  const s = u.toString()
  return s ? `?${s}` : ''
}

// ── Query shape for task listings ────────────────────────────────────
export interface TasksQuery {
  page?:       number
  perPage?:    number
  state?:      TaskState
  priority?:   Priority
  assigneeId?: string
  search?:     string
}

// ── REST API surface ─────────────────────────────────────────────────
export const api = {
  // Tasks
  listTasks:   (q: TasksQuery = {}) => req<Paginated<Task>>('GET', `/tasks${qs(q)}`),
  getTask:     (id: string)          => req<Task>('GET', `/tasks/${id}`),
  createTask:  (dto: ValidatedTaskData) => req<Task>('POST', '/tasks', dto),
  updateTask:  (id: string, dto: Partial<ValidatedTaskData>) => req<Task>('PATCH', `/tasks/${id}`, dto),
  setTaskState:(id: string, newState: TaskState) => req<Task>('PATCH', `/tasks/${id}/state`, { newState }),
  deleteTask:  (id: string) => req<void>('DELETE', `/tasks/${id}`),

  // Users
  listUsers:   () => req<User[]>('GET', '/users'),

  // Stats
  getStats:    () => req<TasksStats>('GET', '/stats'),

  // Generator
  startGenerator:  () => req<{ running: true }>('POST', '/tasks/generate/start'),
  stopGenerator:   () => req<{ running: false }>('POST', '/tasks/generate/stop'),
  generatorStatus: () => req<{ running: boolean }>('GET', '/tasks/generate/status'),

  // Comments — Gold
  listComments:   (taskId: string) => req<Comment[]>('GET',    `/tasks/${taskId}/comments`),
  addComment:     (taskId: string, body: string) => req<Comment>('POST',  `/tasks/${taskId}/comments`, { body }),
  editComment:    (id: string, body: string) => req<Comment>('PATCH', `/comments/${id}`, { body }),
  deleteComment:  (id: string) => req<void>('DELETE', `/comments/${id}`),
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError
}

// ── GraphQL helper (Gold) ────────────────────────────────────────────
/**
 * Tiny GraphQL client. Use when you want to exercise the Gold surface.
 * Example:
 *   const data = await graphql<{ tasks: PaginatedTasks }>(
 *     `query ($q: TasksQueryInput) { tasks(query: $q) { items { id title commentCount } total } }`,
 *     { q: { perPage: 10 } },
 *   )
 */
export async function graphql<T>(
  query:      string,
  variables?: Record<string, unknown>,
): Promise<T> {
  let res: Response
  try {
    res = await fetch(GRAPHQL_URL, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ query, variables }),
    })
  } catch {
    throw new NetworkError()
  }
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  const body = await res.json() as { data?: T; errors?: { message: string }[] }
  if (body.errors?.length) throw new ApiError(400, body.errors.map(e => e.message).join('; '))
  return body.data as T
}
