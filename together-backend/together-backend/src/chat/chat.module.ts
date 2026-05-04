// Destination: together-backend/together-backend/src/chat/chat.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MongooseModule } from '@nestjs/mongoose'
import { ChatService } from './chat.service'
import { ChatGateway } from './chat.gateway'
import { ChatController } from './chat.controller'
import { Message, MessageSchema } from './schemas/message.schema'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    AuthModule,
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject:  [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI', 'mongodb://localhost:27017/together_chat'),
      }),
    }),
    MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }]),
  ],
  controllers: [ChatController],
  providers:   [ChatService, ChatGateway],
  exports:     [ChatService],
})
export class ChatModule {}