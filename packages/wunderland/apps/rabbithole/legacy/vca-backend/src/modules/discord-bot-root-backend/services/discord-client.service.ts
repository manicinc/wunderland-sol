/**
 * @file discord-client.service.ts
 * @description Core lifecycle service for the Discord bot. Manages the discord.js Client,
 * registers slash commands, and routes events to the appropriate handlers.
 *
 * Reads config directly from process.env to avoid NestJS ConfigService DI issues
 * with tsx/esbuild decorator metadata emission.
 */

import { Injectable, Inject, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Partials,
  type Interaction,
  type Message,
} from 'discord.js';
import { SLASH_COMMANDS } from '../discord-bot.constants.js';
import { SlashCommandsHandler } from '../handlers/slash-commands.handler.js';
import { ButtonHandler } from '../handlers/button.handler.js';
import { ModalHandler } from '../handlers/modal.handler.js';
import { MessageHandler } from '../handlers/message.handler.js';
import { WunderbotPersonalityService } from './wunderbot-personality.service.js';

@Injectable()
export class DiscordClientService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DiscordBot');
  private client: Client | null = null;
  private ready = false;

  constructor(
    @Inject(SlashCommandsHandler) private readonly slashHandler: SlashCommandsHandler,
    @Inject(ButtonHandler) private readonly buttonHandler: ButtonHandler,
    @Inject(ModalHandler) private readonly modalHandler: ModalHandler,
    @Inject(MessageHandler) private readonly messageHandler: MessageHandler,
    @Inject(WunderbotPersonalityService) private readonly personality: WunderbotPersonalityService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = process.env.DISCORD_BOT_TOKEN;
    const applicationId = process.env.DISCORD_APPLICATION_ID;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (!token) {
      this.logger.warn('DISCORD_BOT_TOKEN not set — bot will not start.');
      return;
    }
    if (!applicationId) {
      this.logger.warn('DISCORD_APPLICATION_ID not set — bot will not start.');
      return;
    }

    // Connect in background so NestJS startup isn't blocked
    this.connectInBackground(token, applicationId, guildId || undefined);
  }

  private connectInBackground(token: string, applicationId: string, guildId?: string): void {
    (async () => {
      try {
        // Register slash commands (guild-scoped for instant availability)
        if (guildId) {
          await this.registerCommands(token, applicationId, guildId);
        } else {
          this.logger.warn('DISCORD_GUILD_ID not set — slash commands will not be registered.');
        }

        this.client = new Client({
          intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.DirectMessages,
            GatewayIntentBits.GuildMembers,
          ],
          partials: [Partials.Channel, Partials.Message],
        });

        this.client.once('ready', (c) => {
          this.ready = true;
          this.logger.log(`Logged in as ${c.user.tag}`);
          // Bind personality engine to the client for mood-driven presence updates
          this.personality.setClient(c);
          this.logger.log(`Wunderbot personality engine connected — mood: ${this.personality.getMood()}`);
        });

        this.client.on('interactionCreate', (interaction: Interaction) =>
          this.handleInteraction(interaction),
        );

        this.client.on('messageCreate', (message: Message) =>
          this.handleMessage(message),
        );

        this.client.on('error', (error) => {
          this.logger.error(`Client error: ${error.message}`);
        });

        this.client.on('warn', (warning) => {
          this.logger.warn(`Client warning: ${warning}`);
        });

        this.logger.log('Connecting to Discord...');
        const loginPromise = this.client.login(token);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Login timed out after 15s')), 15_000),
        );
        await Promise.race([loginPromise, timeout]);
        this.logger.log('Login successful, waiting for ready event...');
      } catch (error: any) {
        this.logger.error(`Failed to start: ${error.message}`);
        if (this.client) {
          this.client.destroy();
          this.client = null;
        }
      }
    })();
  }

  async onModuleDestroy(): Promise<void> {
    this.personality.destroy();
    if (this.client) {
      this.client.destroy();
      this.logger.log('Client destroyed.');
      this.client = null;
      this.ready = false;
    }
  }

  getClient(): Client | null {
    return this.ready ? this.client : null;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async registerCommands(
    token: string,
    applicationId: string,
    guildId: string,
  ): Promise<void> {
    const rest = new REST({ version: '10' }).setToken(token);
    try {
      this.logger.log(`Registering ${SLASH_COMMANDS.length} slash commands for guild ${guildId}...`);
      await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
        body: SLASH_COMMANDS,
      });
      this.logger.log('Slash commands registered.');
    } catch (error: any) {
      this.logger.error(`Failed to register slash commands: ${error.message}`);
    }
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.slashHandler.handle(interaction);
      } else if (interaction.isButton()) {
        await this.buttonHandler.handle(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.modalHandler.handle(interaction);
      }
    } catch (error: any) {
      this.logger.error(`Interaction error: ${error.message}`);
      try {
        const reply = {
          content: 'Something went wrong. Please try again.',
          ephemeral: true,
        };
        if (interaction.isRepliable()) {
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
          } else {
            await interaction.reply(reply);
          }
        }
      } catch {
        // Interaction timed out, nothing we can do
      }
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    if (message.author.bot) return;
    try {
      await this.messageHandler.handle(message);
    } catch (error: any) {
      this.logger.error(`Message handler error: ${error.message}`);
    }
  }
}
