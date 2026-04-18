import Cookies from 'js-cookie'

const KEYS = {
  lastPage:      'together_last_page',
  lastTaskId:    'together_last_task',
  searchHistory: 'together_searches',
  filters:       'together_filters',
  user:          'together_user',
  workspace:     'together_workspace',
} as const

// ── Types ──────────────────────────────────────────────────────────────
export interface FilterPrefs {
  state:    string
  assignee: string
  priority: string
}

export interface ActivityData {
  lastPage:      string | null
  lastTaskId:    string | null
  searchHistory: string[]
  filters:       FilterPrefs | null
}

// ── Writers ────────────────────────────────────────────────────────────
export function trackPage(path: string) {
  Cookies.set(KEYS.lastPage, path, { expires: 7 })
}

export function trackTask(id: string) {
  Cookies.set(KEYS.lastTaskId, id, { expires: 7 })
}

export function trackSearch(query: string) {
  if (!query.trim()) return
  const raw     = Cookies.get(KEYS.searchHistory)
  const history: string[] = raw ? JSON.parse(raw) : []
  // Keep last 5, deduplicated
  const updated = [query, ...history.filter(h => h !== query)].slice(0, 5)
  Cookies.set(KEYS.searchHistory, JSON.stringify(updated), { expires: 7 })
}

export function trackFilters(filters: FilterPrefs) {
  Cookies.set(KEYS.filters, JSON.stringify(filters), { expires: 7 })
}

// ── Reader ─────────────────────────────────────────────────────────────
export function getActivity(): ActivityData {
  const raw = Cookies.get(KEYS.filters)
  const searchRaw = Cookies.get(KEYS.searchHistory)
  return {
    lastPage:      Cookies.get(KEYS.lastPage)   ?? null,
    lastTaskId:    Cookies.get(KEYS.lastTaskId) ?? null,
    searchHistory: searchRaw ? JSON.parse(searchRaw) : [],
    filters:       raw ? JSON.parse(raw) : null,
  }
}

export function getUser() {
  const raw = Cookies.get(KEYS.user)
  return raw ? JSON.parse(raw) : null
}

export function clearActivity() {
  Object.values(KEYS).forEach(k => Cookies.remove(k))
}
