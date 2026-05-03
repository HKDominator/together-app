// ─────────────────────────────────────────────────────────────────────
// Destination: hooks/useInfiniteScroll.ts
// IntersectionObserver-based hook for infinite scroll.
//
// Returns two refs:
//   - `sentinelRef` — the load-more trigger. When it enters the
//     viewport (root ±200px), `onLoadMore` fires.
//   - `prefetchRef` — the prefetch trigger. When it enters viewport,
//     `onPrefetch` fires. Place it ~one viewport above the sentinel so
//     the network request starts before the user actually needs it.
//
// Silver A2's offline behavior is respected — the parent decides when
// to actually call loadMore based on `isOnline`.
// ─────────────────────────────────────────────────────────────────────
'use client'
import { useEffect, useRef } from 'react'

interface Options {
  enabled?:     boolean
  onLoadMore:   () => void | Promise<void>
  onPrefetch?:  () => void
}

export function useInfiniteScroll({ enabled = true, onLoadMore, onPrefetch }: Options) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const prefetchRef = useRef<HTMLDivElement>(null)

  // Keep callbacks in refs so we don't re-create observers on every
  // render (callbacks typically change identity each render).
  const loadRef     = useRef(onLoadMore)
  const prefetchCbRef = useRef(onPrefetch)
  useEffect(() => { loadRef.current     = onLoadMore },  [onLoadMore])
  useEffect(() => { prefetchCbRef.current = onPrefetch }, [onPrefetch])

  useEffect(() => {
    if (!enabled) return

    const loadObserver = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) loadRef.current() },
      { rootMargin: '200px 0px', threshold: 0 },
    )
    const prefetchObserver = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) prefetchCbRef.current?.() },
      { rootMargin: '0px 0px', threshold: 0 },
    )

    const s = sentinelRef.current
    const p = prefetchRef.current
    if (s) loadObserver.observe(s)
    if (p) prefetchObserver.observe(p)

    return () => {
      loadObserver.disconnect()
      prefetchObserver.disconnect()
    }
  }, [enabled])

  return { sentinelRef, prefetchRef }
}
