// BUG-30: network blip during heartbeat must NOT log user out
// BUG-31: multiple concurrent 401s must trigger only one /auth/refresh
import { describe, it, expect, vi, afterEach } from 'vitest'
import { auth } from '@/lib/auth'
import { api, NetworkError, isNetworkError } from '@/lib/api'

afterEach(() => { vi.restoreAllMocks() })

// ── BUG-30: auth.ts must wrap fetch failure as NetworkError ───────────
describe('auth.call() network error wrapping (BUG-30)', () => {
  it('throws NetworkError when fetch is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    await expect(auth.me()).rejects.toBeInstanceOf(NetworkError)
  })

  it('thrown error passes isNetworkError()', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    try { await auth.me() } catch (e) {
      expect(isNetworkError(e)).toBe(true)
    }
  })
})

// ── BUG-31: single-flight refresh ────────────────────────────────────
describe('api refresh single-flight (BUG-31)', () => {
  it('triggers only one /auth/refresh for multiple concurrent 401s', async () => {
    let refreshCallCount = 0
    let taskCallCount = 0

    vi.stubGlobal('fetch', vi.fn().mockImplementation((url: string) => {
      if ((url as string).includes('/auth/refresh')) {
        refreshCallCount++
        return Promise.resolve(new Response('{}', { status: 200 }))
      }
      // First two task calls → 401; subsequent → 200
      if (taskCallCount++ < 2) {
        return Promise.resolve(new Response('Unauthorized', { status: 401 }))
      }
      return Promise.resolve(new Response(
        JSON.stringify({ items: [], total: 0, page: 1, perPage: 20, totalPages: 0 }), { status: 200 }
      ))
    }))

    await Promise.all([api.listTasks(), api.listTasks()])

    expect(refreshCallCount).toBe(1)
  })
})
