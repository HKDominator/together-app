// FD-06: PresenceContext rides the existing tasks socket (ADR-0002 — no second
// connection). Seeds from a full snapshot on every connect (missed events are
// never replayed), then patches with online/offline/viewing deltas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import { PresenceProvider, usePresence } from '@/context/PresenceContext'

let sockHandlers: Record<string, Array<(...args: unknown[]) => void>> = {}
const mockEmit = vi.fn()
const mockSocket = {
  // socket.io exposes `connected`; the provider uses it to decide whether it
  // missed the connect-time snapshot and must re-request one on (re)mount.
  connected: false,
  on:  (ev: string, cb: (...args: unknown[]) => void) => { (sockHandlers[ev] ??= []).push(cb) },
  off: (ev: string, cb: (...args: unknown[]) => void) => {
    sockHandlers[ev] = (sockHandlers[ev] ?? []).filter(h => h !== cb)
  },
  emit: mockEmit,
}
const emitWs = (ev: string, ...args: unknown[]) =>
  (sockHandlers[ev] ?? []).forEach(h => h(...args))

vi.mock('@/lib/ws', () => ({ getSocket: () => mockSocket }))

function OnlineHarness() {
  const { onlineUserIds } = usePresence()
  return <span data-testid="online">{[...onlineUserIds].sort().join(',')}</span>
}

function ViewingHarness() {
  const { viewingByUser } = usePresence()
  return <span data-testid="viewing">{JSON.stringify(viewingByUser)}</span>
}

describe('PresenceContext (FD-06)', () => {
  beforeEach(() => { sockHandlers = {}; mockEmit.mockReset(); mockSocket.connected = false })

  it('seeds onlineUserIds from the presence:state snapshot on connect', async () => {
    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: ['u1', 'u2'], viewing: {} }) })

    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u1,u2'))
  })

  it('adds a userId to onlineUserIds when presence:online delta arrives', async () => {
    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: ['u1'], viewing: {} }) })
    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u1'))

    act(() => { emitWs('presence:online', { userId: 'u2' }) })

    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u1,u2'))
  })

  it('removes a userId from onlineUserIds when presence:offline delta arrives', async () => {
    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: ['u1', 'u2'], viewing: {} }) })
    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u1,u2'))

    act(() => { emitWs('presence:offline', { userId: 'u1' }) })

    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u2'))
  })

  it('seeds viewingByUser from the presence:state snapshot', async () => {
    render(<PresenceProvider><ViewingHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: [], viewing: { u2: 't42' } }) })

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('viewing').textContent!)).toEqual({ u2: 't42' }),
    )
  })

  it('updates viewingByUser when presence:viewing delta arrives', async () => {
    render(<PresenceProvider><ViewingHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: [], viewing: {} }) })
    act(() => { emitWs('presence:viewing', { userId: 'u2', taskId: 't7' }) })

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('viewing').textContent!)).toEqual({ u2: 't7' }),
    )
  })

  it('removes a viewingByUser entry when taskId is null (tab closed / navigated away)', async () => {
    render(<PresenceProvider><ViewingHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: [], viewing: { u2: 't7' } }) })
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('viewing').textContent!)).toEqual({ u2: 't7' }),
    )

    act(() => { emitWs('presence:viewing', { userId: 'u2', taskId: null }) })

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('viewing').textContent!)).toEqual({}),
    )
  })

  it('setViewingTask emits presence:viewing to the socket', async () => {
    function Btn() {
      const { setViewingTask } = usePresence()
      return <button onClick={() => setViewingTask('t99')}>focus</button>
    }
    const { getByText } = render(<PresenceProvider><Btn /></PresenceProvider>)

    act(() => { getByText('focus').click() })

    expect(mockEmit).toHaveBeenCalledWith('presence:viewing', { taskId: 't99' })
  })

  it('setViewingTask is a no-op for tmp_* ids — no emit, no ref update (BUG-25 guard)', async () => {
    function Btn() {
      const { setViewingTask } = usePresence()
      return (
        <>
          <button onClick={() => setViewingTask('tmp_123_abc')}>tmp</button>
        </>
      )
    }
    const { getByText } = render(<PresenceProvider><Btn /></PresenceProvider>)

    act(() => { getByText('tmp').click() })
    expect(mockEmit).not.toHaveBeenCalled()

    // Reconnect must not re-emit the blocked tmp id
    act(() => { emitWs('connect') })
    expect(mockEmit).not.toHaveBeenCalled()
  })

  it('clears onlineUserIds on socket disconnect — stale online data must not persist', async () => {
    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    act(() => { emitWs('presence:state', { online: ['u1', 'u2'], viewing: {} }) })
    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe('u1,u2'))

    act(() => { emitWs('disconnect') })

    await waitFor(() => expect(screen.getByTestId('online').textContent).toBe(''))
  })

  it('exposes isPresenceConnected false on disconnect, true on connect', async () => {
    function ConnHarness() {
      const { isPresenceConnected } = usePresence()
      return <span data-testid="conn">{String(isPresenceConnected ?? 'undefined')}</span>
    }
    render(<PresenceProvider><ConnHarness /></PresenceProvider>)

    act(() => { emitWs('connect') })
    await waitFor(() => expect(screen.getByTestId('conn').textContent).toBe('true'))

    act(() => { emitWs('disconnect') })
    await waitFor(() => expect(screen.getByTestId('conn').textContent).toBe('false'))
  })

  // Regression: the landing page is outside the (app) layout, so navigating
  // there unmounts PresenceProvider and returning remounts it onto the live
  // singleton socket. No `connect` fires and the server only pushes
  // presence:state on a real connect — so the remounted provider would sit
  // with an empty online set (partner dot stuck offline) unless it re-requests.
  it('re-requests the snapshot (emits presence:sync) when mounting onto an already-connected socket', () => {
    mockSocket.connected = true

    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    expect(mockEmit).toHaveBeenCalledWith('presence:sync')
  })

  it('does not re-request a snapshot when the socket is not yet connected (server pushes state on connect)', () => {
    mockSocket.connected = false

    render(<PresenceProvider><OnlineHarness /></PresenceProvider>)

    expect(mockEmit).not.toHaveBeenCalledWith('presence:sync')
  })

  it('re-emits the current viewing focus on socket reconnect so the server record is fresh', async () => {
    function Btn() {
      const { setViewingTask } = usePresence()
      return <button onClick={() => setViewingTask('t55')}>focus</button>
    }
    const { getByText } = render(<PresenceProvider><Btn /></PresenceProvider>)

    // Set a viewing focus first
    act(() => { getByText('focus').click() })
    mockEmit.mockReset()

    // Simulate socket reconnect
    act(() => { emitWs('connect') })

    expect(mockEmit).toHaveBeenCalledWith('presence:viewing', { taskId: 't55' })
  })
})
