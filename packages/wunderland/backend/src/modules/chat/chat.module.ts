/**
 * @file chat.module.ts
 * @description NestJS module for chat and diagram endpoints. Bundles the
 * ChatController (which handles both /chat and /diagram routes) and provides
 * a placeholder ChatService for future business-logic extraction.
 */

import { Module } from '@nestjs/common';
import { ChatController, DiagramController } from './chat.controller.js';
import { ChatService } from './chat.service.js';

@Module({
  controllers: [ChatController, DiagramController],
  providers: [ChatService],
})
export class ChatModule {}
