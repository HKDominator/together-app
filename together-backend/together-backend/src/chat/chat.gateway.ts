// Destination: together-backend/together-backend/src/chat/chat.gateway.ts
// Reuses socket.io. Same CORS pattern as TasksGateway. Each connection
// joins room 'workspace' (the couple shares one room) — easy to extend
// to multi-room later.
//
// Auth note (SEC-04): every socket handshake is authenticated against the
// access token (WsAuthService). The sender identity is derived from the
// authenticated user — the payload senderId/senderName are ignored so a
// client can no longer impersonate the other partner. Message bodies are
// length-bounded.
import { Logger } from '@nestjs/common'
import {
  WebSocketGateway, WebSocketServer,
  OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, MessageBody, ConnectedSocket,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { ChatService } from './chat.service'
import { WsAuthService } from '../auth/ws-auth.service'
import type { User } from '../users/entities/user.entity'

// Hard cap on a single chat message. Anything longer is truncated before it
// is persisted or broadcast.
const MAX_MESSAGE_LEN = 4000

interface IncomingMessage {
  roomId?:      string
  senderColor?: string
  body:         string
}

@WebSocketGateway({
  cors: {
    // Read from CLIENT_ORIGIN (same var main.ts uses) so the allowed
    // origins follow the deployment. Falls back to localhost for dev.
    origin: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(ChatGateway.name)
  @WebSocketServer() server!: Server

  constructor(
    private readonly chat: ChatService,
    private readonly wsAuth: WsAuthService,
  ) {}

  async handleConnection(client: Socket) {
    const user = await this.wsAuth.authenticate(client)
    if (!user) {
      this.log.warn(`chat client ${client.id} rejected — unauthenticated`)
      client.disconnect(true)
      return
    }
    client.data.user = user
    client.join('workspace')
    this.log.log(`chat client ${client.id} (${user.id}) joined 'workspace'`)
  }
  handleDisconnect(client: Socket) {
    this.log.log(`chat client ${client.id} disconnected`)
  }

  @SubscribeMessage('chat:send')
  async onSend(
    @MessageBody() payload: IncomingMessage,
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user as User | undefined
    if (!user) { client.disconnect(true); return }

    const body = (payload?.body ?? '').trim().slice(0, MAX_MESSAGE_LEN)
    if (!body) return

    const saved = await this.chat.insert({
      roomId:      'workspace',
      senderId:    user.id,
      senderName:  user.name,
      senderColor: user.avatarColor ?? '#888',
      body,
    })
    // Broadcast to everyone in the room (including sender — gives them
    // confirmation + canonical id/timestamp from the server).
    this.server.to(saved.roomId).emit('chat:message', saved)
  }

  @SubscribeMessage('chat:typing')
  onTyping(
    @MessageBody() _payload: unknown,
    @ConnectedSocket() client: Socket,
  ) {
    // Just relay — typing indicators don't need persistence. Identity comes
    // from the authenticated socket, not the client payload.
    const user = client.data?.user as User | undefined
    if (!user) return
    client.to('workspace').emit('chat:typing', { senderId: user.id, senderName: user.name })
  }
}