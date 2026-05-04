// Destination: together-backend/together-backend/src/chat/schemas/message.schema.ts
// Mongo-stored chat message. NoSQL is justified here because:
//   - chat is append-only, no joins
//   - schema-on-read fits future evolution (reactions, attachments)
//   - we benefit from the natural _id ordering for chronological reads
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

@Schema({ collection: 'messages', timestamps: true })
export class Message {
  @Prop({ required: true, index: true })  roomId!: string    // 'workspace' | direct-id
  @Prop({ required: true })               senderId!: string  // Postgres user UUID
  @Prop({ required: true })               senderName!: string
  @Prop({ default: '#000' })              senderColor!: string
  @Prop({ required: true })               body!: string
  // createdAt / updatedAt added by `timestamps: true`
}

export type MessageDoc = HydratedDocument<Message>
export const MessageSchema = SchemaFactory.createForClass(Message)
MessageSchema.index({ roomId: 1, createdAt: 1 })