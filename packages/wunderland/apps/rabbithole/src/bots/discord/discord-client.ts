/**
 * @file discord-client.ts
 * @description Main Discord client. Manages the bot lifecycle,
 * registers event handlers, and coordinates all services.
 * Plain class — no NestJS decorators.
 */

import { Client, GatewayIntentBits, Partials, REST, Routes } from 'discord.js';
import { SLASH_COMMANDS } from './constants';
import { KnowledgeBaseService } from './knowledge-base';
import { AiResponderService } from './ai-responder';
import { ServerSetupService } from './server-setup';
import { TicketBridgeService } from './ticket-bridge';
import { GiphyService } from './giphy';
import { WunderbotPersonalityService } from './wunderbot-personality';
import { SlashCommandsHandler } from './handlers/slash-commands';
import { ButtonHandler } from './handlers/button';
import { ModalHandler } from './handlers/modal';
import { MessageHandler } from './handlers/message';
import { BotLogger } from '../shared/logger';

const logger = new BotLogger('DiscordClient');

export class DiscordClient {
  private client: Client | null = null;
  private personality: WunderbotPersonalityService;
  private slashHandler: SlashCommandsHandler;
  private buttonHandler: ButtonHandler;
  private modalHandler: ModalHandler;
  private messageHandler: MessageHandler;

  constructor() {
    // Wire up all services (replacing NestJS DI)
    const knowledgeBase = new KnowledgeBaseService();
    const aiResponder = new AiResponderService(knowledgeBase);
    const serverSetup = new ServerSetupService(knowledgeBase);
    const ticketBridge = new TicketBridgeService(aiResponder);
    const giphy = new GiphyService();
    this.personality = new WunderbotPersonalityService();

    this.slashHandler = new SlashCommandsHandler(serverSetup, aiResponder, knowledgeBase);
    this.buttonHandler = new ButtonHandler(aiResponder);
    this.modalHandler = new ModalHandler(ticketBridge);
    this.messageHandler = new MessageHandler(aiResponder, this.personality, ticketBridge, giphy);
  }

  async start(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
      logger.warn('DISCORD_BOT_TOKEN not set. Discord bot will NOT start.');
      return;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildVoiceStates,
        ],
        partials: [Partials.Message, Partials.Channel],
      });

      this.client.once('ready', async () => {
        logger.log(`Discord bot logged in as ${this.client!.user?.tag}`);
        await this.registerSlashCommands(token);
        this.updatePresence();
        setInterval(() => this.updatePresence(), 5 * 60 * 1000);
      });

      // Event routing
      this.client.on('interactionCreate', async (interaction) => {
        try {
          if (interaction.isChatInputCommand()) {
            await this.slashHandler.handle(interaction);
          } else if (interaction.isButton()) {
            await this.buttonHandler.handle(interaction);
          } else if (interaction.isModalSubmit()) {
            await this.modalHandler.handle(interaction);
          }
        } catch (error: any) {
          logger.error(`Interaction error: ${error.message}`, error.stack);
        }
      });

      this.client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        try {
          await this.messageHandler.handle(message);
        } catch (error: any) {
          logger.error(`Message handler error: ${error.message}`, error.stack);
        }
      });

      await this.client.login(token);
    } catch (error: any) {
      logger.error(`Failed to connect Discord bot: ${error.message}`, error.stack);
    }
  }

  destroy(): void {
    this.personality.destroy();
    if (this.client) {
      this.client.destroy();
      logger.log('Discord client destroyed.');
    }
  }

  // --- Slash Command Registration ---

  private async registerSlashCommands(token: string): Promise<void> {
    const appId = process.env.DISCORD_APPLICATION_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!appId) {
      logger.warn('DISCORD_APPLICATION_ID not set. Slash commands not registered.');
      return;
    }

    try {
      const rest = new REST({ version: '10' }).setToken(token);

      if (guildId) {
        await rest.put(Routes.applicationGuildCommands(appId, guildId), {
          body: SLASH_COMMANDS,
        });
        logger.log(`Registered ${SLASH_COMMANDS.length} guild slash commands.`);
      } else {
        await rest.put(Routes.applicationCommands(appId), {
          body: SLASH_COMMANDS,
        });
        logger.log(`Registered ${SLASH_COMMANDS.length} global slash commands.`);
      }
    } catch (error: any) {
      logger.error(`Failed to register slash commands: ${error.message}`);
    }
  }

  // --- Presence & Bio ---

  private async updatePresence(): Promise<void> {
    if (!this.client?.user) return;

    // Update presence activity
    const activity = this.personality.getPresenceActivity();
    this.client.user.setPresence({
      activities: [{ name: activity.name, type: activity.type }],
      status: 'online',
    });

    // Update application description (bot bio) with mood/HEXACO state
    try {
      const bio = this.personality.getBioDescription();
      await this.client.application?.edit({ description: bio });
    } catch (error: any) {
      logger.warn(`Failed to update bot bio: ${error.message}`);
    }
  }
}
