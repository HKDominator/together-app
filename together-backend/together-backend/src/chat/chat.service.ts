// Destination: together-backend/together-backend/src/chat/chat.service.ts
import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Message, MessageDoc } from './schemas/message.schema'

export interface MessagePayload {
  id:           string
  roomId:       string
  senderId:     string
  senderName:   string
  senderColor:  string
  body:         string
  createdAt:    string
}

@Injectable()
export class ChatService {
  constructor(@InjectModel(Message.name) private readonly model: Model<Message>) {}

  async insert(data: Omit<MessagePayload, 'id' | 'createdAt'>): Promise<MessagePayload> {
    const doc = await this.model.create({
      roomId:      data.roomId,
      senderId:    data.senderId,
      senderName:  data.senderName,
      senderColor: data.senderColor,
      body:        data.body.trim(),
    })
    return this.toPayload(doc)
  }

  async listForRoom(roomId: string, limit = 100): Promise<MessagePayload[]> {
    const docs = await this.model.find({ roomId })
      .sort({ createdAt: 1 })   // oldest first — natural reading order
      .limit(limit)
      .lean()
    return docs.map(d => this.toPayload(d as MessageDoc))
  }

  private toPayload(d: MessageDoc): MessagePayload {
    return {
      id:          (d._id as { toString(): string }).toString(),
      roomId:      d.roomId,
      senderId:    d.senderId,
      senderName:  d.senderName,
      senderColor: d.senderColor,
      body:        d.body,
      createdAt:   ((d as any).createdAt as Date).toISOString(),
    }
  }
}