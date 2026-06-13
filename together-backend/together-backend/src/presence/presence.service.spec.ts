// FD-06: server-side presence over the authenticated sockets. A user is
// online iff they hold ≥1 authenticated socket — across tabs and across the
// two client sockets (tasks + chat), and resilient to NestJS registering
// both gateways' connection hooks on the same shared namespace (each socket
// can be reported more than once).
import { PresenceService, PRESENCE_OFFLINE_GRACE_MS } from './presence.service'

interface Broadcast { event: string; payload: unknown }

const make = () => {
  const events: Broadcast[] = []
  const svc = new PresenceService()
  svc.bind((event, payload) => events.push({ event, payload }))
  return { svc, events }
}

describe('PresenceService — online/offline edges (FD-06)', () => {
  it('broadcasts presence:online exactly once when a user gains their first socket', () => {
    const { svc, events } = make()

    svc.connected('u1', 's1')
    svc.connected('u1', 's1') // second gateway hook for the same socket
    svc.connected('u1', 's2') // second tab / chat socket

    expect(events).toEqual([{ event: 'presence:online', payload: { userId: 'u1' } }])
  })

  it('broadcasts presence:offline only after the grace period once the last socket is gone', () => {
    jest.useFakeTimers()
    try {
      const { svc, events } = make()
      svc.connected('u1', 's1')
      svc.connected('u1', 's2')
      events.length = 0

      svc.disconnected('s1')                              // one socket left — nothing
      jest.advanceTimersByTime(PRESENCE_OFFLINE_GRACE_MS)
      expect(events).toEqual([])

      svc.disconnected('s2')                              // last socket — grace starts
      svc.disconnected('s2')                              // duplicate gateway hook — no-op
      jest.advanceTimersByTime(PRESENCE_OFFLINE_GRACE_MS - 1)
      expect(events).toEqual([])                          // still inside grace

      jest.advanceTimersByTime(1)
      expect(events).toEqual([{ event: 'presence:offline', payload: { userId: 'u1' } }])
    } finally {
      jest.useRealTimers()
    }
  })

  it('a reconnect within the grace window emits neither offline nor a duplicate online', () => {
    jest.useFakeTimers()
    try {
      const { svc, events } = make()
      svc.connected('u1', 's1')
      events.length = 0

      svc.disconnected('s1')
      jest.advanceTimersByTime(PRESENCE_OFFLINE_GRACE_MS - 1)
      svc.connected('u1', 's2') // socket.io reconnect with a fresh socket id
      jest.advanceTimersByTime(PRESENCE_OFFLINE_GRACE_MS * 2)

      expect(events).toEqual([]) // partner never saw them leave
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('PresenceService — snapshot (FD-06)', () => {
  it('reports connected users as online, and a user inside the grace window still counts', () => {
    jest.useFakeTimers()
    try {
      const { svc } = make()
      svc.connected('u1', 's1')
      svc.connected('u2', 's2')
      svc.disconnected('s2') // u2 enters grace — not yet offline

      expect(svc.snapshot().online.sort()).toEqual(['u1', 'u2'])

      jest.advanceTimersByTime(PRESENCE_OFFLINE_GRACE_MS)
      expect(svc.snapshot().online).toEqual(['u1'])
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('PresenceService — viewing focus (FD-06)', () => {
  it('broadcasts a user’s viewing focus, null when they leave, and stays silent when unchanged', () => {
    const { svc, events } = make()
    svc.connected('u1', 's1')
    events.length = 0

    svc.setViewing('s1', 'u1', 't1')
    svc.setViewing('s1', 'u1', 't1')  // unchanged — no rebroadcast
    svc.setViewing('s1', 'u1', null)

    expect(events).toEqual([
      { event: 'presence:viewing', payload: { userId: 'u1', taskId: 't1' } },
      { event: 'presence:viewing', payload: { userId: 'u1', taskId: null } },
    ])
  })

  it('aggregates across tabs: the most recent focus wins, and clearing it falls back to the other tab', () => {
    const { svc, events } = make()
    svc.connected('u1', 's1')
    svc.connected('u1', 's2')
    events.length = 0

    svc.setViewing('s1', 'u1', 't1')
    svc.setViewing('s2', 'u1', 't2')  // newer focus in the second tab
    svc.setViewing('s2', 'u1', null)  // second tab leaves → back to t1

    expect(events).toEqual([
      { event: 'presence:viewing', payload: { userId: 'u1', taskId: 't1' } },
      { event: 'presence:viewing', payload: { userId: 'u1', taskId: 't2' } },
      { event: 'presence:viewing', payload: { userId: 'u1', taskId: 't1' } },
    ])
  })

  it('a socket disconnect clears its focus immediately — no ghost “looking at this” indicator', () => {
    jest.useFakeTimers()
    try {
      const { svc, events } = make()
      svc.connected('u1', 's1')
      svc.setViewing('s1', 'u1', 't1')
      events.length = 0

      svc.disconnected('s1') // tab crashed / closed mid-modal

      expect(events).toContainEqual(
        { event: 'presence:viewing', payload: { userId: 'u1', taskId: null } },
      )
      expect(svc.snapshot().viewing).toEqual({})
    } finally {
      jest.useRealTimers()
    }
  })

  it('snapshot carries each user’s current focus', () => {
    const { svc } = make()
    svc.connected('u1', 's1')
    svc.connected('u2', 's2')
    svc.setViewing('s1', 'u1', 't1')

    expect(svc.snapshot().viewing).toEqual({ u1: 't1' })
  })
})
