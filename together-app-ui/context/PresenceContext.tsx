'use client'
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/ws'

export interface PresenceSnapshot {
  online:  string[]
  viewing: Record<string, string>
}

interface PresenceContextValue {
  onlineUserIds:  Set<string>
  viewingByUser:  Record<string, string>
  setViewingTask: (taskId: string | null) => void
}

const PresenceContext = createContext<PresenceContextValue | null>(null)

export function PresenceProvider({ children }: { children: ReactNode }) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [viewingByUser, setViewingByUser] = useState<Record<string, string>>({})
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
      if (viewingTaskRef.current !== null) {
        sock.emit('presence:viewing', { taskId: viewingTaskRef.current })
      }
    }

    sock.on('presence:state',   onState)
    sock.on('presence:online',  onOnline)
    sock.on('presence:offline', onOffline)
    sock.on('presence:viewing', onViewing)
    sock.on('connect',          onConnect)

    return () => {
      sock.off('presence:state',   onState)
      sock.off('presence:online',  onOnline)
      sock.off('presence:offline', onOffline)
      sock.off('presence:viewing', onViewing)
      sock.off('connect',          onConnect)
    }
  }, [])

  const setViewingTask = useCallback((taskId: string | null) => {
    viewingTaskRef.current = taskId
    getSocket().emit('presence:viewing', { taskId })
  }, [])

  return (
    <PresenceContext.Provider value={{ onlineUserIds, viewingByUser, setViewingTask }}>
      {children}
    </PresenceContext.Provider>
  )
}

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence must be used inside <PresenceProvider>')
  return ctx
}
