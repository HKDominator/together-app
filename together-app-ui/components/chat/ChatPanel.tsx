// Destination: together-app-ui/components/chat/ChatPanel.tsx
// Floating chat panel — bottom-right, expandable. Hydrates history
// on mount, then live-updates via socket.io.
'use client'
import { useCallback, useEffect, useRef, useState, KeyboardEvent } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getChatSocket, ChatMessage } from '@/lib/chat-ws'
import { chatApi } from '@/lib/chat-api'

const ROOM = 'workspace'

export default function ChatPanel() {
  const { user } = useAuth()
  const [open,     setOpen]     = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft,    setDraft]    = useState('')
  const [typing,   setTyping]   = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hydrate REST history once when opened.
  useEffect(() => {
    if (!open || !user) return
    chatApi.history(ROOM).then(setMessages).catch(() => {})
  }, [open, user])

  // Subscribe to live messages.
  useEffect(() => {
    if (!user) return
    const s = getChatSocket()
    const onMessage = (m: ChatMessage) => {
      if (m.roomId !== ROOM) return
      setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
    }
    const onTyping = (p: { senderId: string; senderName: string }) => {
      if (p.senderId === user.id) return
      setTyping(p.senderName)
      window.setTimeout(() => setTyping(null), 1500)
    }
    s.on('chat:message', onMessage)
    s.on('chat:typing',  onTyping)
    return () => { s.off('chat:message', onMessage); s.off('chat:typing', onTyping) }
  }, [user])

  // Auto-scroll on new message.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open])

  const send = useCallback(() => {
    const body = draft.trim()
    if (!body || !user) return
    getChatSocket().emit('chat:send', {
      roomId: ROOM,
      senderId:    user.id,
      senderName:  user.name,
      senderColor: user.avatarColor,
      body,
    })
    setDraft('')
  }, [draft, user])

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    else if (user) {
      getChatSocket().emit('chat:typing', {
        roomId: ROOM, senderId: user.id, senderName: user.name,
      })
    }
  }

  if (!user) return null

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-3 rounded-full text-white text-sm font-semibold shadow-lg bg-cr"
        >
          💬 Chat
        </button>
      ) : (
        <div className="w-80 h-[28rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          <div className="px-4 py-3 flex items-center justify-between border-b bg-sl">
            <span className="text-white text-sm font-semibold">Workspace chat</span>
            <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white text-lg">×</button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <p className="text-center text-xs text-gray-400 mt-8">No messages yet — say hi 👋</p>
            )}
            {messages.map(m => {
              const mine = m.senderId === user.id
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} gap-2`}>
                  {!mine && (
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                      style={{ background: m.senderColor }}>
                      {m.senderName.split(' ').map(s => s[0]).join('').slice(0, 2)}
                    </div>
                  )}
                  <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                    mine ? 'bg-cm text-sl rounded-br-sm' : 'bg-white border border-gray-100 rounded-bl-sm text-gray-800'
                  }`}>
                    {!mine && <div className="text-xs font-semibold mb-0.5" style={{ color: m.senderColor }}>{m.senderName}</div>}
                    <div className="whitespace-pre-wrap break-words">{m.body}</div>
                    <div className={`text-xs mt-1 ${mine ? 'text-sl/60' : 'text-gray-400'}`}>
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            {typing && (
              <div className="text-xs text-gray-400 italic pl-2">{typing} is typing…</div>
            )}
          </div>

          <div className="border-t bg-white p-3 flex gap-2">
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-red-400 focus:outline-none"
            />
            <button onClick={send} className="px-4 py-2 rounded-lg text-white text-sm font-semibold bg-cr">Send</button>
          </div>
        </div>
      )}
    </div>
  )
}