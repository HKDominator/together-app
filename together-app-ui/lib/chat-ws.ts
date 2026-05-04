// Destination: together-app-ui/lib/chat-ws.ts
// Separate socket connection for chat — keeps task-realtime and chat
// concerns decoupled. Same backend, different namespace usage.
import { io, Socket } from 'socket.io-client'
import { WS_URL } from './ws'

export interface ChatMessage {
  id:          string
  roomId:      string
  senderId:    string
  senderName:  string
  senderColor: string
  body:        string
  createdAt:   string
}

let chatSocket: Socket | null = null
export function getChatSocket(): Socket {
  if (!chatSocket) {
    chatSocket = io(WS_URL, { autoConnect: true, transports: ['websocket'], reconnection: true })
  }
  return chatSocket
}