// ─────────────────────────────────────────────────────────────────────
// Destination: context/TasksContext.tsx
// Gold A2 changes from Silver:
//   1. Initial hydrate now fetches page 1 with a real perPage (20),
//      not a 100-item dump.
//   2. New state: `currentPage`, `hasMore`, `totalTasks`.
//   3. New method: `loadMore()` — fetches the next page, appends to
//      tasks. Safe to call repeatedly; no-ops while a fetch is in
//      flight or when hasMore is false.
//   4. New method: `prefetchNext()` — warms the network cache for the
//      next page without applying it to state. Called when the user
//      reaches ~80% scroll.
//   5. WebSocket `task:created` still upserts into the local array;
//      `totalTasks` is incremented so pagination math stays accurate.
//
// Everything else — offline queue, WS subscription, state machine —
// is unchanged from Silver.
// ─────────────────────────────────────────────────────────────────────
'use client'
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Task, TaskState, User, ValidatedTaskData } from '@/types'
import { api, isNetworkError } from '@/lib/api'
import { getSocket } from '@/lib/ws'
import { offlineQueue } from '@/lib/offlineQueue'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { useAuth } from '@/context/AuthContext'

const INITIAL_PAGE_SIZE = 20
const PAGE_SIZE         = 20

export const VALID_TRANSITIONS: Record<TaskState, TaskState[]> = {
  todo:        ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done:        [],
  cancelled:   [],
}

// ── Reducer ───────────────────────────────────────────────────────────
interface ReducerState {
  tasks: Task[]
}

type Action =
  | { type: 'SET_TASKS';     payload: Task[] }
  | { type: 'APPEND_TASKS';  payload: Task[] }
  | { type: 'UPSERT';        payload: Task }
  | { type: 'REMOVE';        payload: { id: string } }
  | { type: 'REPLACE_ID';    payload: { oldId: string; task: Task } }

export function tasksReducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'SET_TASKS':
      return { ...state, tasks: action.payload }
    case 'APPEND_TASKS': {
      // Dedupe — a WS event can race a page fetch.
      const existing = new Set(state.tasks.map(t => t.id))
      const fresh    = action.payload.filter(t => !existing.has(t.id))
      return { ...state, tasks: [...state.tasks, ...fresh] }
    }
    case 'UPSERT': {
      const idx = state.tasks.findIndex(t => t.id === action.payload.id)
      if (idx === -1) return { ...state, tasks: [action.payload, ...state.tasks] }
      const next = state.tasks.slice(); next[idx] = action.payload
      return { ...state, tasks: next }
    }
    case 'REMOVE':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload.id) }
    case 'REPLACE_ID': {
      const idx = state.tasks.findIndex(t => t.id === action.payload.oldId)
      if (idx === -1) return { ...state, tasks: [action.payload.task, ...state.tasks] }
      const next = state.tasks.slice(); next[idx] = action.payload.task
      return { ...state, tasks: next }
    }
    default:
      return state
  }
}

// ── Context value ────────────────────────────────────────────────────
interface TasksContextValue {
  tasks:            Task[]
  users:            User[]
  currentUser:      User
  isOnline:         boolean
  isLoading:        boolean
  isLoadingMore:    boolean
  hasMore:          boolean
  totalTasks:       number
  pendingCount:     number
  generatorRunning: boolean

  createTask:     (dto: ValidatedTaskData) => Promise<void>
  updateTask:     (id: string, dto: Partial<ValidatedTaskData>) => Promise<void>
  deleteTask:     (id: string) => Promise<void>
  setTaskState:   (id: string, newState: TaskState) => Promise<void>

  loadMore:       () => Promise<void>
  prefetchNext:   () => void

  startGenerator: () => Promise<void>
  stopGenerator:  () => Promise<void>
}

const TasksContext = createContext<TasksContextValue | null>(null)

const tempId = () => `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

export function makeOptimisticTask(dto: ValidatedTaskData, id: string, createdById: string): Task {
  const now = new Date().toISOString()
  return {
    id,
    title:       dto.title,
    description: dto.description ?? '',
    assigneeId:  dto.assigneeId,
    createdById,
    priority:    dto.priority,
    state:       'todo',
    dueDate:     dto.dueDate || null,
    createdAt:   now as unknown as Date,
    updatedAt:   now as unknown as Date,
  }
}

// ── Provider ─────────────────────────────────────────────────────────
export function TasksProvider({ children }: { children: ReactNode }) {
  const { user: authUser } = useAuth()
  const [state, dispatch]             = useReducer(tasksReducer, { tasks: [] })
  const [isLoading, setIsLoading]     = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks]   = useState(0)
  const [totalPages, setTotalPages]   = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [generatorRunning, setGeneratorRunning] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const { isOnline } = useOnlineStatus()

  const isOnlineRef = useRef(isOnline)
  useEffect(() => { isOnlineRef.current = isOnline }, [isOnline])

  // Refs to guard concurrent pagination calls — the scroll handler can
  // easily fire two "loadMore" attempts before the first resolves.
  const loadingMoreRef = useRef(false)
  const prefetchedPageRef = useRef<Map<number, Task[]>>(new Map())

  const refreshPending = useCallback(() => setPendingCount(offlineQueue.size()), [])

  const hasMore = currentPage < totalPages


  // ── Initial hydrate ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const page = await api.listTasks({ page: 1, perPage: INITIAL_PAGE_SIZE })
        if (!cancelled) {
          dispatch({ type: 'SET_TASKS', payload: page.items })
          setCurrentPage(page.page)
          setTotalTasks(page.total)
          setTotalPages(page.totalPages)
        }
      } catch { /* offline banner handles this */ }
      finally { if (!cancelled) setIsLoading(false) }

      try {
        const gs = await api.generatorStatus()
        if (!cancelled) setGeneratorRunning(gs.running)
      } catch { /* ignore */ }

      refreshPending()
    })()
    return () => { cancelled = true }
  }, [refreshPending])

  // ── loadMore() ─────────────────────────────────────────────────
  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !isOnlineRef.current) return
    const nextPage = currentPage + 1
    if (nextPage > totalPages) return

    loadingMoreRef.current = true
    setIsLoadingMore(true)

    try {
      // Use prefetched page if available — zero network request.
      const cached = prefetchedPageRef.current.get(nextPage)
      if (cached) {
        dispatch({ type: 'APPEND_TASKS', payload: cached })
        prefetchedPageRef.current.delete(nextPage)
        setCurrentPage(nextPage)
      } else {
        const page = await api.listTasks({ page: nextPage, perPage: PAGE_SIZE })
        dispatch({ type: 'APPEND_TASKS', payload: page.items })
        setCurrentPage(page.page)
        setTotalTasks(page.total)
        setTotalPages(page.totalPages)
      }
    } catch { /* silently — scroll will re-trigger when back online */ }
    finally {
      loadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [currentPage, totalPages])

  // ── prefetchNext() ─────────────────────────────────────────────
  const prefetchNext = useCallback(() => {
    if (!isOnlineRef.current) return
    const nextPage = currentPage + 1
    if (nextPage > totalPages) return
    if (prefetchedPageRef.current.has(nextPage)) return
    if (loadingMoreRef.current) return

    // Fire-and-forget — store the result in the prefetch cache.
    ;(async () => {
      try {
        const page = await api.listTasks({ page: nextPage, perPage: PAGE_SIZE })
        prefetchedPageRef.current.set(nextPage, page.items)
        // Also keep totalPages / totalTasks fresh in case generator added rows.
        setTotalPages(page.totalPages)
        setTotalTasks(page.total)
      } catch { /* ignore */ }
    })()
  }, [currentPage, totalPages])

  // ── WebSocket subscription ─────────────────────────────────────
  useEffect(() => {
    const sock = getSocket()

    const onCreated = (t: Task) => {
      dispatch({ type: 'UPSERT', payload: t })
      setTotalTasks(n => n + 1)
      // Invalidate prefetch cache — inserting a new row shifts pages.
      prefetchedPageRef.current.clear()
    }
    const onUpdated = (t: Task) => dispatch({ type: 'UPSERT', payload: t })
    const onDeleted = ({ id }: { id: string }) => {
      dispatch({ type: 'REMOVE', payload: { id } })
      setTotalTasks(n => Math.max(0, n - 1))
      prefetchedPageRef.current.clear()
    }
    const onGenStart = () => setGeneratorRunning(true)
    const onGenStop  = () => setGeneratorRunning(false)

    sock.on('task:created',      onCreated)
    sock.on('task:updated',      onUpdated)
    sock.on('task:deleted',      onDeleted)
    sock.on('generator:started', onGenStart)
    sock.on('generator:stopped', onGenStop)

    return () => {
      sock.off('task:created',      onCreated)
      sock.off('task:updated',      onUpdated)
      sock.off('task:deleted',      onDeleted)
      sock.off('generator:started', onGenStart)
      sock.off('generator:stopped', onGenStop)
    }
  }, [])

   useEffect(() => {
    let cancelled = false
    api.listUsers()
      .then(list => { if (!cancelled) setUsers(list) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // ── Drain offline queue on reconnect ───────────────────────────
  useEffect(() => {
    if (!isOnline) return
    let cancelled = false

    ;(async () => {
      const ops = offlineQueue.list()
      for (const op of ops) {
        if (cancelled) break
        try {
          if (op.kind === 'create') {
            const real = await api.createTask(op.dto)
            dispatch({ type: 'REPLACE_ID', payload: { oldId: op.tempId, task: real } })
          } else if (op.kind === 'update') {
            const real = await api.updateTask(op.taskId, op.dto)
            dispatch({ type: 'UPSERT', payload: real })
          } else if (op.kind === 'delete') {
            await api.deleteTask(op.taskId)
          } else if (op.kind === 'state') {
            const real = await api.setTaskState(op.taskId, op.newState)
            dispatch({ type: 'UPSERT', payload: real })
          }
          offlineQueue.remove(op.id)
        } catch (err) {
          if (isNetworkError(err)) break
          offlineQueue.remove(op.id)
          try {
            const page = await api.listTasks({ page: 1, perPage: INITIAL_PAGE_SIZE })
            if (!cancelled) {
              dispatch({ type: 'SET_TASKS', payload: page.items })
              setCurrentPage(page.page)
              setTotalTasks(page.total)
              setTotalPages(page.totalPages)
            }
          } catch { /* ignore */ }
        }
        refreshPending()
      }
    })()

    return () => { cancelled = true }
  }, [isOnline, refreshPending])

  // ── Public mutations ───────────────────────────────────────────
  const createTask = useCallback(async (dto: ValidatedTaskData) => {
    const tId = tempId()
    dispatch({ type: 'UPSERT', payload: makeOptimisticTask(dto, tId, authUser?.id ?? '') })
    setTotalTasks(n => n + 1)

    if (!isOnlineRef.current) { offlineQueue.enqueueCreate(tId, dto); refreshPending(); return }
    try {
      const real = await api.createTask(dto)
      dispatch({ type: 'REPLACE_ID', payload: { oldId: tId, task: real } })
    } catch (err) {
      if (isNetworkError(err)) {
        offlineQueue.enqueueCreate(tId, dto); refreshPending()
      } else {
        dispatch({ type: 'REMOVE', payload: { id: tId } })
        setTotalTasks(n => Math.max(0, n - 1))
        throw err
      }
    }
  }, [refreshPending])

  const updateTask = useCallback(async (id: string, dto: Partial<ValidatedTaskData>) => {
    const before = state.tasks.find(t => t.id === id)
    if (!before) return
    const optimistic: Task = { ...before, ...dto, updatedAt: new Date().toISOString() as unknown as Date }
    dispatch({ type: 'UPSERT', payload: optimistic })

    if (!isOnlineRef.current) { offlineQueue.enqueueUpdate(id, dto); refreshPending(); return }
    try {
      const real = await api.updateTask(id, dto)
      dispatch({ type: 'UPSERT', payload: real })
    } catch (err) {
      if (isNetworkError(err)) { offlineQueue.enqueueUpdate(id, dto); refreshPending() }
      else { dispatch({ type: 'UPSERT', payload: before }); throw err }
    }
  }, [state.tasks, refreshPending])

  const deleteTask = useCallback(async (id: string) => {
    const before = state.tasks.find(t => t.id === id)
    if (!before) return
    dispatch({ type: 'REMOVE', payload: { id } })
    setTotalTasks(n => Math.max(0, n - 1))

    if (!isOnlineRef.current) { offlineQueue.enqueueDelete(id); refreshPending(); return }
    try {
      await api.deleteTask(id)
    } catch (err) {
      if (isNetworkError(err)) { offlineQueue.enqueueDelete(id); refreshPending() }
      else { dispatch({ type: 'UPSERT', payload: before }); setTotalTasks(n => n + 1); throw err }
    }
  }, [state.tasks, refreshPending])

  const setTaskState = useCallback(async (id: string, newState: TaskState) => {
    const before = state.tasks.find(t => t.id === id)
    if (!before) return
    if (!VALID_TRANSITIONS[before.state].includes(newState)) {
      throw new Error(`Invalid transition: ${before.state} → ${newState}`)
    }
    const optimistic: Task = { ...before, state: newState, updatedAt: new Date().toISOString() as unknown as Date }
    dispatch({ type: 'UPSERT', payload: optimistic })

    if (!isOnlineRef.current) { offlineQueue.enqueueStateChange(id, newState); refreshPending(); return }
    try {
      const real = await api.setTaskState(id, newState)
      dispatch({ type: 'UPSERT', payload: real })
    } catch (err) {
      if (isNetworkError(err)) { offlineQueue.enqueueStateChange(id, newState); refreshPending() }
      else { dispatch({ type: 'UPSERT', payload: before }); throw err }
    }
  }, [state.tasks, refreshPending])

  const startGenerator = useCallback(async () => {
    await api.startGenerator(); setGeneratorRunning(true)
  }, [])
  const stopGenerator = useCallback(async () => {
    await api.stopGenerator(); setGeneratorRunning(false)
  }, [])

  return (
    <TasksContext.Provider
      value={{
        tasks:        state.tasks,
        users:        users,
        currentUser:  users.find(u => u.id === authUser?.id) ?? users[0],
        isOnline,
        isLoading,
        isLoadingMore,
        hasMore,
        totalTasks,
        pendingCount,
        generatorRunning,
        createTask,
        updateTask,
        deleteTask,
        setTaskState,
        loadMore,
        prefetchNext,
        startGenerator,
        stopGenerator,
      }}
    >
      {children}
    </TasksContext.Provider>
  )
}

export function useTasks(): TasksContextValue {
  const ctx = useContext(TasksContext)
  if (!ctx) throw new Error('useTasks must be used inside <TasksProvider>')
  return ctx
}
