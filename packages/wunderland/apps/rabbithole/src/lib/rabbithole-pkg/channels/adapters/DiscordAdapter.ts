/**
 * @fileoverview Discord Channel Adapter for RabbitHole
 * @module @framers/rabbithole/channels/adapters/DiscordAdapter
 *
 * Implements the IChannelAdapter interface for Discord using discord.js.
 */

import { BaseChannelAdapter } from '../BaseChannelAdapter.js';
import type {
  ChannelAdapterConfig,
  DiscordCredentials,
  OutboundChannelMessage,
  DeliveryStatus,
  ChannelInfo,
  MessageFormatting,
  InboundChannelMessage,
  ChannelUserAction,
} from '../IChannelAdapter.js';

/**
 * Discord channel adapter using discord.js.
 *
 * @example
 * ```typescript
 * const discord = new DiscordAdapter({
 *   platform: 'discord',
 *   credentials: {
 *     platform: 'discord',
 *     botToken: '...',
 *     applicationId: '...',
 *     publicKey: '...',
 *   },
 *   tenantId: 'acme-corp',
 * });
 *
 * await discord.connect();
 * ```
 */
export class DiscordAdapter extends BaseChannelAdapter {
  readonly platform = 'discord' as const;

  private client?: unknown; // Discord.Client
  private credentials: DiscordCredentials;

  constructor(config: ChannelAdapterConfig) {
    super(config);

    if (config.credentials.platform !== 'discord') {
      throw new Error('DiscordAdapter requires Discord credentials');
    }

    this.credentials = config.credentials;
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      // Dynamic import discord.js
      const { Client, GatewayIntentBits, Events } =
        await import('discord.js');

      const client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ],
      });

      // Handle incoming messages
      client.on(Events.MessageCreate, async (message: { author: { bot: boolean; id: string; username: string; avatarURL: () => string | null }; id: string; guildId: string | null; channelId: string; content: string; attachments: Map<string, { url: string; name: string; contentType: string | null; size: number }>; mentions: { users: Map<string, unknown> }; createdAt: Date }) => {
        if (message.author.bot) return;

        const inbound: InboundChannelMessage = {
          platformMessageId: message.id,
          platform: 'discord',
          workspaceId: message.guildId ?? 'dm',
          channelId: message.channelId,
          userId: message.author.id,
          userName: message.author.username,
          userAvatarUrl: message.author.avatarURL() ?? undefined,
          content: message.content,
          attachments: Array.from(message.attachments.values()).map((a) => ({
            type: 'file' as const,
            url: a.url,
            name: a.name,
            mimeType: a.contentType ?? undefined,
            size: a.size,
          })),
          botMentioned: message.mentions.users.has(client.user?.id ?? ''),
          isDirectMessage: !message.guildId,
          receivedAt: message.createdAt,
        };

        await this.emitMessage(inbound);
      });

      // Handle button interactions
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.on(Events.InteractionCreate, async (interaction: any) => {
        if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

        const action: ChannelUserAction = {
          actionId: interaction.customId,
          userId: interaction.user.id,
          userName: interaction.user.username,
          channelId: interaction.channelId ?? '',
          messageId: interaction.message.id,
          value: interaction.customId,
          timestamp: new Date(),
        };

        await interaction.deferUpdate();
        await this.emitAction(action);
      });

      client.on(Events.ClientReady, () => {
        this.setStatus('connected');
        this.log('Connected to Discord');
      });

      client.on(Events.Error, (error: Error) => {
        this.emitError(error);
      });

      await client.login(this.credentials.botToken);
      this.client = client;
    } catch (error) {
      this.setStatus('error');
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();

    if (this.client) {
      const client = this.client as { destroy: () => void };
      client.destroy();
      this.client = undefined;
    }

    this.setStatus('disconnected');
    this.log('Disconnected from Discord');
  }

  async sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus> {
    if (!this.client) {
      return this.createDeliveryStatus('failed', undefined, 'Not connected');
    }

    try {
      const client = this.client as {
        channels: { fetch: (id: string) => Promise<{ send: (opts: unknown) => Promise<{ id: string }> } | null> };
      };

      const channel = await client.channels.fetch(message.channelId);
      if (!channel || !('send' in channel)) {
        return this.createDeliveryStatus('failed', undefined, 'Channel not found or not text-based');
      }

      const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = await import('discord.js');

      const options: Record<string, unknown> = {
        content: this.truncateContent(message.content, 2000), // Discord limit
      };

      // Add embeds if provided
      if (message.formatting?.embeds) {
        options.embeds = message.formatting.embeds.map((e) => {
          const embed = new EmbedBuilder();
          if (e.title) embed.setTitle(e.title);
          if (e.description) embed.setDescription(e.description);
          if (e.color) embed.setColor(parseInt(e.color.replace('#', ''), 16));
          if (e.url) embed.setURL(e.url);
          if (e.thumbnail) embed.setThumbnail(e.thumbnail.url);
          if (e.footer) embed.setFooter({ text: e.footer.text, iconURL: e.footer.iconUrl });
          if (e.fields) embed.addFields(e.fields);
          if (e.timestamp) embed.setTimestamp(e.timestamp);
          return embed;
        });
      }

      // Add interactive elements (buttons)
      if (message.interactiveElements?.length) {
        const row = new ActionRowBuilder();
        for (const el of message.interactiveElements) {
          if (el.type === 'button') {
            const button = new ButtonBuilder()
              .setCustomId(el.actionId)
              .setLabel(el.label)
              .setStyle(
                el.style === 'danger' ? ButtonStyle.Danger :
                el.style === 'primary' ? ButtonStyle.Primary :
                ButtonStyle.Secondary
              );
            if (el.disabled) button.setDisabled(true);
            row.addComponents(button);
          }
        }
        options.components = [row];
      }

      const result = await channel.send(options);
      return this.createDeliveryStatus('delivered', result.id);
    } catch (error) {
      return this.createDeliveryStatus('failed', undefined, error instanceof Error ? error.message : String(error));
    }
  }

  async updateMessage(
    channelId: string,
    messageId: string,
    content: string,
    _formatting?: MessageFormatting
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const client = this.client as {
      channels: {
        fetch: (id: string) => Promise<{
          messages: { fetch: (id: string) => Promise<{ edit: (content: string) => Promise<void> }> };
        } | null>;
      };
    };

    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(messageId);
    await message.edit(content);
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const client = this.client as {
      channels: {
        fetch: (id: string) => Promise<{
          messages: { fetch: (id: string) => Promise<{ delete: () => Promise<void> }> };
        } | null>;
      };
    };

    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(messageId);
    await message.delete();
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const client = this.client as {
      channels: {
        fetch: (id: string) => Promise<{
          id: string;
          name: string;
          type: number;
          memberCount?: number;
          topic?: string | null;
        } | null>;
      };
    };

    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');

    // Discord channel types: 0=GuildText, 1=DM, 2=GuildVoice, etc.
    let type: ChannelInfo['type'] = 'channel';
    if (channel.type === 1) type = 'dm';
    else if (channel.type === 4) type = 'group';

    return {
      channelId: channel.id,
      name: channel.name ?? 'DM',
      type,
      memberCount: channel.memberCount,
      description: channel.topic ?? undefined,
    };
  }

  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Not connected');
    }

    const client = this.client as {
      channels: {
        fetch: (id: string) => Promise<{
          messages: { fetch: (id: string) => Promise<{ react: (emoji: string) => Promise<void> }> };
        } | null>;
      };
    };

    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');

    const message = await channel.messages.fetch(messageId);
    await message.react(emoji);
  }
}
