import { vi, describe, it, expect, afterEach } from 'vitest'
import { graphql, GRAPHQL_URL } from '@/lib/api'

afterEach(() => vi.unstubAllGlobals())

// BUG-32: graphql() omits credentials:'include', so no auth cookie is
// sent. SEC-01 guards now protect the resolvers — every call 401s without
// the cookie. The REST client (req()) already sends credentials:'include';
// graphql() must do the same.

describe('graphql() — auth credentials (BUG-32)', () => {
  it('sends credentials: include so the auth cookie is forwarded', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { tasks: [] } }),
    } as unknown as Response)
    vi.stubGlobal('fetch', fetchMock)

    await graphql<{ tasks: unknown[] }>('query { tasks { id } }')

    expect(fetchMock).toHaveBeenCalledWith(
      GRAPHQL_URL,
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('still throws NetworkError when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('network')))
    const { NetworkError } = await import('@/lib/api')
    await expect(graphql('query { foo }')).rejects.toBeInstanceOf(NetworkError)
  })

  it('throws ApiError on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({
      ok: false, status: 401, statusText: 'Unauthorized',
    } as Response))
    const { ApiError } = await import('@/lib/api')
    await expect(graphql('query { foo }')).rejects.toBeInstanceOf(ApiError)
  })
})
