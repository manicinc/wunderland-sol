/**
 * @fileoverview Discord SDK wrapper using discord.js.
 * Handles bot lifecycle, message sending, and event dispatch.
 */

import {
  Client,
  GatewayIntentBits,
  AttachmentBuilder,
  ChannelType,
  type Message,
  type TextBasedChannel,
  type TextBasedChannelFields,
  type APIEmbed,
} from 'discord.js';

export interface DiscordChannelConfig {
  botToken: string;
  applicationId?: string;
  intents?: number[];
}

export class DiscordService {
  private client: Client | null = null;
  private running = false;
  private messageHandlers: Array<(message: Message) => void> = [];
  private readonly config: DiscordChannelConfig;

  constructor(config: DiscordChannelConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.running) return;

    const intents = this.config.intents ?? [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ];

    this.client = new Client({ intents });

    // Register inbound message listener
    this.client.on('messageCreate', (message: Message) => {
      // Ignore messages from the bot itself
      if (message.author.id === this.client?.user?.id) return;
      for (const handler of this.messageHandlers) {
        handler(message);
      }
    });

    // Login and wait for ready
    await new Promise<void>((resolve, reject) => {
      if (!this.client) return reject(new Error('Client not created'));

      const timeout = setTimeout(() => {
        reject(new Error('Discord client ready timeout after 30s'));
      }, 30_000);

      this.client.once('ready', () => {
        clearTimeout(timeout);
        this.running = true;
        resolve();
      });

      this.client.login(this.config.botToken).catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  async shutdown(): Promise<void> {
    if (!this.running || !this.client) return;
    this.client.destroy();
    this.running = false;
    this.client = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  onMessage(handler: (message: Message) => void): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: (message: Message) => void): void {
    const idx = this.messageHandlers.indexOf(handler);
    if (idx >= 0) this.messageHandlers.splice(idx, 1);
  }

  async sendMessage(
    channelId: string,
    text: string,
    options?: {
      embeds?: APIEmbed[];
      files?: AttachmentBuilder[];
      replyToMessageId?: string;
    },
  ): Promise<{ id: string; channelId: string; timestamp: string }> {
    const channel = await this.fetchTextChannel(channelId);
    const msg = await channel.send({
      content: text || undefined,
      embeds: options?.embeds,
      files: options?.files,
      reply: options?.replyToMessageId
        ? { messageReference: options.replyToMessageId }
        : undefined,
    });
    return { id: msg.id, channelId: msg.channelId, timestamp: msg.createdAt.toISOString() };
  }

  async sendFile(
    channelId: string,
    url: string,
    filename?: string,
    description?: string,
  ): Promise<{ id: string }> {
    const channel = await this.fetchTextChannel(channelId);
    const attachment = new AttachmentBuilder(url, {
      name: filename,
      description,
    });
    const msg = await channel.send({ files: [attachment] });
    return { id: msg.id };
  }

  async setTyping(channelId: string): Promise<void> {
    const channel = await this.fetchTextChannel(channelId);
    await channel.sendTyping();
  }

  async getBotInfo(): Promise<{ id: string; username: string; discriminator: string; tag: string } | null> {
    if (!this.client?.user) return null;
    return {
      id: this.client.user.id,
      username: this.client.user.username,
      discriminator: this.client.user.discriminator,
      tag: this.client.user.tag,
    };
  }

  /**
   * Access the underlying discord.js Client for advanced operations.
   * Throws if the service has not been initialized.
   */
  getClient(): Client {
    if (!this.client) throw new Error('DiscordService not initialized');
    return this.client;
  }

  private async fetchTextChannel(channelId: string): Promise<TextBasedChannel & TextBasedChannelFields> {
    if (!this.client) throw new Error('DiscordService not initialized');
    const channel = await this.client.channels.fetch(channelId);
    if (!channel || !('send' in channel)) {
      throw new Error(`Channel ${channelId} is not a text-based channel or does not exist`);
    }
    return channel as TextBasedChannel & TextBasedChannelFields;
  }
}
