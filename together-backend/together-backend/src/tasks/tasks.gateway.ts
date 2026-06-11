import { Injectable, Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { Task } from './entities/task.entity'
import { WsAuthService } from '../auth/ws-auth.service'

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
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(TasksGateway.name)

  @WebSocketServer()
  server!: Server

  constructor(private readonly wsAuth: WsAuthService) {}

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
    this.log.log(`client connected: ${client.id} (${user.id})`)
  }

  handleDisconnect(client: Socket) {
    this.log.log(`client disconnected: ${client.id}`)
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
