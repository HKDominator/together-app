// Destination: together-backend/together-backend/src/chat/chat.gateway.ts
// Reuses socket.io. Same CORS pattern as TasksGateway. Each connection
// joins room 'workspace' (the couple shares one room) — easy to extend
// to multi-room later.
//
// Auth note: the assignment says "no need for tokens yet". So we trust
// the senderId in the payload — it's read from the auth cookie on the
// REST `/chat/send` route in production, but for the WS we accept it
// in the message body. This is enough for Silver's persistence focus.
import { Logger } from '@nestjs/common'
import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'

interface IncomingMessage {
  roomId:       string
  senderId:     string
  senderName:   string
  senderColor?: string
  body:         string
}

@WebSocketGateway({
  cors: {
    origin:      ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(ChatGateway.name)
  @WebSocketServer() server!: Server

  constructor(private readonly chat: ChatService) {}

  handleConnection(client: Socket) {
    // Default-join the workspace room. Extend with handshake auth later.
    client.join('workspace')
    this.log.log(`chat client ${client.id} joined 'workspace'`)
  }
  handleDisconnect(client: Socket) {
    this.log.log(`chat client ${client.id} disconnected`)
  }

  @SubscribeMessage('chat:send')
  async onSend(
    @MessageBody() payload: IncomingMessage,
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.body?.trim() || !payload.senderId) return

    const saved = await this.chat.insert({
      roomId:      payload.roomId || 'workspace',
      senderId:    payload.senderId,
      senderName:  payload.senderName  ?? 'Unknown',
      senderColor: payload.senderColor ?? '#888',
      body:        payload.body,
    })
    // Broadcast to everyone in the room (including sender — gives them
    // confirmation + canonical id/timestamp from the server).
    this.server.to(saved.roomId).emit('chat:message', saved)
  }

  @SubscribeMessage('chat:typing')
  onTyping(
    @MessageBody() payload: { roomId: string; senderId: string; senderName: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Just relay — typing indicators don't need persistence.
    client.to(payload.roomId || 'workspace').emit('chat:typing', payload)
  }
}