'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/ws'

export interface PresenceSnapshot {
  online:  string[]
  viewing: Record<string, string>
}

interface PresenceContextValue {
  onlineUserIds:       Set<string>
  viewingByUser:       Record<string, string>
  setViewingTask:      (taskId: string | null) => void
  isPresenceConnected?: boolean
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUserIds,       setOnlineUserIds]       = useState<Set<string>>(new Set())
  const [viewingByUser,       setViewingByUser]        = useState<Record<string, string>>({})
  const [isPresenceConnected, setIsPresenceConnected] = useState<boolean>(true)
  const viewingTaskRef = useRef<string | null>(null)

  useEffect(() => {
    const sock = getSocket()

    const onState = (snap: PresenceSnapshot) => {
      setOnlineUserIds(new Set(snap.online))
      setViewingByUser(snap.viewing ?? {})
    }
    const onOnline = ({ userId }: { userId: string }) => {
      setOnlineUserIds(prev => new Set(prev).add(userId))
    }
    const onOffline = ({ userId }: { userId: string }) => {
      setOnlineUserIds(prev => { const s = new Set(prev); s.delete(userId); return s })
    }
    const onViewing = ({ userId, taskId }: { userId: string; taskId: string | null }) => {
      setViewingByUser(prev => {
        const next = { ...prev }
        if (taskId) { next[userId] = taskId }
        else { delete next[userId] }
        return next
      })
    }
    // Re-emit our own viewing focus on reconnect — the server's record died
    // with the old socket and the new socket starts with no focus registered.
    const onConnect = () => {
      setIsPresenceConnected(true)
      if (viewingTaskRef.current !== null) {
        sock.emit('presence:viewing', { taskId: viewingTaskRef.current })
      }
    }
    // Clear stale presence data on disconnect so partners don't show as
    // online when the WS link is down.
    const onDisconnect = () => {
      setIsPresenceConnected(false)
      setOnlineUserIds(new Set())
    }

    sock.on('presence:state',   onState)
    sock.on('presence:online',  onOnline)
    sock.on('presence:offline', onOffline)
    sock.on('presence:viewing', onViewing)
    sock.on('connect',          onConnect)
    sock.on('disconnect',       onDisconnect)

    return () => {
      sock.off('presence:state',   onState)
      sock.off('presence:online',  onOnline)
      sock.off('presence:offline', onOffline)
      sock.off('presence:viewing', onViewing)
      sock.off('connect',          onConnect)
      sock.off('disconnect',       onDisconnect)
    }
  }, [])

  const setViewingTask = useCallback((taskId: string | null) => {
    // BUG-25: offline-created tmp_ ids have no shared server record to co-view.
    // Silently ignore so a page that mounts with a temp id never leaks a ghost focus.
    if (typeof taskId === 'string' && taskId.startsWith('tmp_')) return
    viewingTaskRef.current = taskId
    getSocket().emit('presence:viewing', { taskId })
  }, [])

  return (
    <PresenceContext.Provider value={{ onlineUserIds, viewingByUser, setViewingTask, isPresenceConnected }}>
      {children}
    </PresenceContext.Provider>
  )
}

// Safe empty default — presence is "soft" data. Components outside
// <PresenceProvider> (e.g. in isolation tests) simply see everyone offline.
const EMPTY_PRESENCE: PresenceContextValue = {
  onlineUserIds:  new Set(),
  viewingByUser:  {},
  setViewingTask: () => {},
}

export function usePresence(): PresenceContextValue {
  return useContext(PresenceContext) ?? EMPTY_PRESENCE
}
