import { Injectable, Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { Task } from './entities/task.entity'
import { WsAuthService } from '../auth/ws-auth.service'
import { PresenceService } from '../presence/presence.service'
import type { User } from '../users/entities/user.entity'

/**
 * WebSocket gateway for broadcasting task mutations.
 *
 * Emits three events — every client subscribed receives every event;
 * there's no per-user filtering for a two-user couple workspace.
 *
 *   task:created    → Task
 *   task:updated    → Task
 *   task:deleted    → { id: string }
 *   generator:started / generator:stopped → no payload
 *
 * Origin is pinned to the Next.js dev server; same pair as in main.ts.
 */

const wsOrigins = (process.env.CLIENT_ORIGIN
  ?? 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',').map(s => s.trim()).filter(Boolean)

  
@Injectable()
@WebSocketGateway({ cors: { origin: wsOrigins, credentials: true } })
export class TasksGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(TasksGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(
    private readonly wsAuth: WsAuthService,
    private readonly presence: PresenceService,
  ) {}

  afterInit(server: Server) {
    // FD-06: presence broadcasts ride the same socket.io server as the
    // task events — every authenticated client hears them (single-tenant).
    this.presence.bind((event, payload) => server.emit(event, payload))
  }

  async handleConnection(client: Socket) {
    // SEC-04: authenticate the handshake. Unauthenticated clients are dropped
    // before they can receive any task-mutation broadcast (eavesdropping).
    const user = await this.wsAuth.authenticate(client)
    if (!user) {
      this.log.warn(`client ${client.id} rejected — unauthenticated`)
      client.disconnect(true)
      return
    }
    client.data.user = user
    // FD-06: register first (so the snapshot includes this user), then seed
    // the client — presence events are never replayed, the snapshot is the
    // only trustworthy way to (re)seed after a disconnect.
    this.presence.connected(user.id, client.id)
    client.emit('presence:state', this.presence.snapshot())
    this.log.log(`client connected: ${client.id} (${user.id})`)
  }

  handleDisconnect(client: Socket) {
    // No-op for sockets that never authenticated.
    this.presence.disconnected(client.id)
    this.log.log(`client disconnected: ${client.id}`)
  }

  // FD-06: a client reports which task it has in focus (detail page / edit
  // modal). Identity comes from the authenticated socket — the payload's
  // userId, if any, is ignored (SEC-04 pattern). Offline-created tmp_* ids
  // have no shared record to co-view, so they read as "no focus" (BUG-25).
  @SubscribeMessage('presence:viewing')
  onViewing(
    @MessageBody() payload: { taskId?: string | null },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data?.user as User | undefined
    if (!user) return
    const raw = payload?.taskId
    const taskId =
      typeof raw === 'string' && raw.length > 0 && !raw.startsWith('tmp_') ? raw : null
    this.presence.setViewing(client.id, user.id, taskId)
  }

  emitTaskCreated(task: Task):  void { this.server?.emit('task:created', task) }
  emitTaskUpdated(task: Task):  void { this.server?.emit('task:updated', task) }
  emitTaskDeleted(id: string):  void { this.server?.emit('task:deleted', { id }) }

  emitGeneratorStarted(): void { this.server?.emit('generator:started') }
  emitGeneratorStopped(): void { this.server?.emit('generator:stopped') }

  // BUG-33: comment realtime events
  emitCommentCreated(comment: object): void { this.server?.emit('comment:created', comment) }
  emitCommentUpdated(comment: object): void { this.server?.emit('comment:updated', comment) }
  emitCommentDeleted(id: string, taskId: string): void {
    this.server?.emit('comment:deleted', { id, taskId })
  }
}
