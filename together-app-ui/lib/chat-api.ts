// Destination: together-app-ui/lib/chat-api.ts
import { API_URL } from './api'
import type { ChatMessage } from './chat-ws'

export const chatApi = {
  async history(roomId: string): Promise<ChatMessage[]> {
    const r = await fetch(`${API_URL}/chat/rooms/${encodeURIComponent(roomId)}/messages`, {
      credentials: 'include',
    })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    return r.json()
  },
}