/**
 * @file discord-bot.module.ts
 * @description Conditional NestJS module for the Rabbit Hole AI Discord bot.
 * Only loads when DISCORD_BOT_ENABLED=true. Uses the same DynamicModule
 * pattern as WunderlandModule.register().
 */

import { Module, type DynamicModule } from '@nestjs/common';
import { SupportModule } from '../support/support.module.js';
import { DiscordClientService } from './services/discord-client.service.js';
import { ServerSetupService } from './services/server-setup.service.js';
import { KnowledgeBaseService } from './services/knowledge-base.service.js';
import { AiResponderService } from './services/ai-responder.service.js';
import { TicketBridgeService } from './services/ticket-bridge.service.js';
import { SlashCommandsHandler } from './handlers/slash-commands.handler.js';
import { ButtonHandler } from './handlers/button.handler.js';
import { ModalHandler } from './handlers/modal.handler.js';
import { MessageHandler } from './handlers/message.handler.js';
import { WunderbotPersonalityService } from './services/wunderbot-personality.service.js';
import { GiphyService } from './services/giphy.service.js';

@Module({})
export class DiscordBotModule {
  static register(): DynamicModule {
    if (process.env.DISCORD_BOT_ENABLED !== 'true') {
      return { module: DiscordBotModule };
    }

    return {
      module: DiscordBotModule,
      imports: [SupportModule],
      providers: [
        KnowledgeBaseService,
        AiResponderService,
        ServerSetupService,
        TicketBridgeService,
        GiphyService,
        WunderbotPersonalityService,
        SlashCommandsHandler,
        ButtonHandler,
        ModalHandler,
        MessageHandler,
        DiscordClientService,
      ],
      exports: [DiscordClientService],
    };
  }
}
