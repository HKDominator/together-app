// Destination: together-backend/together-backend/src/chat/chat.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ChatService } from './chat.service'
import { AuthGuard } from '../auth/guards/auth.guard'

@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  /** GET /api/chat/rooms/:roomId/messages?limit=100 — REST history. */
  @Get('rooms/:roomId/messages')
  history(
    @Param('roomId') roomId: string,
    @Query('limit')  limit?: string,
  ) {
    return this.chat.listForRoom(roomId, Number(limit) || 100)
  }
}