import { Injectable, Logger } from '@nestjs/common'
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import { Task } from './entities/task.entity'

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
@Injectable()
@WebSocketGateway({
  cors: {
    origin:      ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  },
})
export class TasksGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly log = new Logger(TasksGateway.name)

  @WebSocketServer()
  server!: Server

  handleConnection(client: Socket) {
    this.log.log(`client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.log.log(`client disconnected: ${client.id}`)
  }

  emitTaskCreated(task: Task):  void { this.server?.emit('task:created', task) }
  emitTaskUpdated(task: Task):  void { this.server?.emit('task:updated', task) }
  emitTaskDeleted(id: string):  void { this.server?.emit('task:deleted', { id }) }

  emitGeneratorStarted(): void { this.server?.emit('generator:started') }
  emitGeneratorStopped(): void { this.server?.emit('generator:stopped') }
}
