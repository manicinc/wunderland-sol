/**
 * @fileoverview Slack Channel Adapter for RabbitHole
 * @module @framers/rabbithole/channels/adapters/SlackAdapter
 *
 * Implements the IChannelAdapter interface for Slack using @slack/bolt.
 */

import { BaseChannelAdapter } from '../BaseChannelAdapter.js';
import type {
  ChannelAdapterConfig,
  SlackCredentials,
  OutboundChannelMessage,
  DeliveryStatus,
  ChannelInfo,
  MessageFormatting,
  InboundChannelMessage,
  ChannelUserAction,
  InteractiveElement,
} from '../IChannelAdapter.js';

// Note: @slack/bolt types would be imported in actual implementation
// For now, we define minimal type stubs
interface SlackApp {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  message: (handler: (args: SlackMessageArgs) => Promise<void>) => void;
  action: (pattern: RegExp | string, handler: (args: SlackActionArgs) => Promise<void>) => void;
  client: SlackWebClient;
}

interface SlackWebClient {
  chat: {
    postMessage: (args: SlackPostMessageArgs) => Promise<{ ts: string; channel: string }>;
    update: (args: SlackUpdateMessageArgs) => Promise<void>;
    delete: (args: { channel: string; ts: string }) => Promise<void>;
  };
  conversations: {
    info: (args: { channel: string }) => Promise<{
      channel: {
        id: string;
        name: string;
        is_channel: boolean;
        is_group: boolean;
        is_im: boolean;
        num_members?: number;
        topic?: { value: string };
      };
    }>;
    list: () => Promise<{
      channels: Array<{
        id: string;
        name: string;
        is_channel: boolean;
        is_group: boolean;
        is_im: boolean;
        num_members?: number;
      }>;
    }>;
  };
  users: {
    info: (args: { user: string }) => Promise<{
      user: {
        id: string;
        name: string;
        real_name?: string;
        profile?: { image_72?: string };
        is_bot?: boolean;
      };
    }>;
  };
  reactions: {
    add: (args: { channel: string; timestamp: string; name: string }) => Promise<void>;
  };
}

interface SlackMessageArgs {
  message: {
    text?: string;
    ts: string;
    user?: string;
    channel?: string;
    thread_ts?: string;
    files?: Array<{ url_private: string; name: string; mimetype: string; size: number }>;
  };
  context: { botUserId: string };
  say: (args: string | SlackSayArgs) => Promise<{ ts: string }>;
}

interface SlackActionArgs {
  action: { action_id: string; value?: string; selected_option?: { value: string } };
  body: { user: { id: string; name: string }; channel?: { id: string }; message?: { ts: string } };
  ack: () => Promise<void>;
  respond: (args: SlackRespondArgs) => Promise<void>;
}

interface SlackPostMessageArgs {
  channel: string;
  text: string;
  thread_ts?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
}

interface SlackUpdateMessageArgs {
  channel: string;
  ts: string;
  text: string;
  blocks?: SlackBlock[];
}

interface SlackSayArgs {
  text: string;
  thread_ts?: string;
  blocks?: SlackBlock[];
}

interface SlackRespondArgs {
  text: string;
  replace_original?: boolean;
  blocks?: SlackBlock[];
}

interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: SlackBlockElement[];
  accessory?: SlackBlockElement;
}

interface SlackBlockElement {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  action_id?: string;
  style?: string;
  value?: string;
  options?: Array<{ text: { type: string; text: string }; value: string }>;
}

interface SlackAttachment {
  color?: string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
}

/**
 * Slack channel adapter using @slack/bolt.
 *
 * @example
 * ```typescript
 * const slack = new SlackAdapter({
 *   platform: 'slack',
 *   credentials: {
 *     platform: 'slack',
 *     botToken: 'xoxb-...',
 *     signingSecret: '...',
 *     appToken: 'xapp-...',
 *   },
 *   tenantId: 'acme-corp',
 * });
 *
 * slack.onMessage(async (msg) => {
 *   console.log('Received:', msg.content);
 * });
 *
 * await slack.connect();
 * ```
 */
export class SlackAdapter extends BaseChannelAdapter {
  readonly platform = 'slack' as const;

  private app?: SlackApp;
  private credentials: SlackCredentials;

  constructor(config: ChannelAdapterConfig) {
    super(config);

    if (config.credentials.platform !== 'slack') {
      throw new Error('SlackAdapter requires Slack credentials');
    }

    this.credentials = config.credentials;
  }

  async connect(): Promise<void> {
    try {
      this.setStatus('connecting');

      // Dynamic import to avoid bundling Slack SDK when not used
      const { App } = await import('@slack/bolt');

      this.app = new App({
        token: this.credentials.botToken,
        signingSecret: this.credentials.signingSecret,
        appToken: this.credentials.appToken,
        socketMode: !!this.credentials.appToken, // Use socket mode if app token provided
      }) as unknown as SlackApp;

      // Register message handler
      this.app.message(async ({ message, context }) => {
        if (!message.text && !message.files?.length) return;

        const inbound: InboundChannelMessage = {
          platformMessageId: message.ts,
          platform: 'slack',
          workspaceId: '', // Would be populated from context in real impl
          channelId: message.channel ?? '',
          threadId: message.thread_ts,
          userId: message.user ?? '',
          userName: '', // Would fetch from users.info
          content: message.text ?? '',
          attachments: message.files?.map((f) => ({
            type: 'file' as const,
            url: f.url_private,
            name: f.name,
            mimeType: f.mimetype,
            size: f.size,
          })),
          botMentioned: message.text?.includes(`<@${context.botUserId}>`) ?? false,
          receivedAt: new Date(),
        };

        await this.emitMessage(inbound);
      });

      // Register action handler for interactive elements
      this.app.action(/.+/, async ({ action, body, ack }) => {
        await ack();

        const userAction: ChannelUserAction = {
          actionId: action.action_id,
          userId: body.user.id,
          userName: body.user.name,
          channelId: body.channel?.id ?? '',
          messageId: body.message?.ts ?? '',
          value: action.value ?? action.selected_option?.value ?? '',
          timestamp: new Date(),
        };

        await this.emitAction(userAction);
      });

      await this.app.start();
      this.setStatus('connected');
      this.log('Connected to Slack');
    } catch (error) {
      this.setStatus('error');
      this.emitError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.cancelReconnect();

    if (this.app) {
      await this.app.stop();
      this.app = undefined;
    }

    this.setStatus('disconnected');
    this.log('Disconnected from Slack');
  }

  async sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus> {
    if (!this.app) {
      return this.createDeliveryStatus('failed', undefined, 'Not connected');
    }

    try {
      const blocks = this.buildSlackBlocks(message);

      const result = await this.app.client.chat.postMessage({
        channel: message.channelId,
        text: message.content,
        thread_ts: message.threadId,
        blocks: blocks.length > 0 ? blocks : undefined,
      });

      return this.createDeliveryStatus('delivered', result.ts);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('ratelimited')) {
        return this.createDeliveryStatus('rate_limited', undefined, errorMessage);
      }

      return this.createDeliveryStatus('failed', undefined, errorMessage);
    }
  }

  async updateMessage(
    channelId: string,
    messageId: string,
    content: string,
    formatting?: MessageFormatting
  ): Promise<void> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    const blocks = formatting?.markdown
      ? [{ type: 'section', text: { type: 'mrkdwn', text: content } }]
      : [];

    await this.app.client.chat.update({
      channel: channelId,
      ts: messageId,
      text: content,
      blocks: blocks.length > 0 ? blocks : undefined,
    });
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    await this.app.client.chat.delete({
      channel: channelId,
      ts: messageId,
    });
  }

  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    const result = await this.app.client.conversations.info({ channel: channelId });
    const channel = result.channel;

    let type: ChannelInfo['type'] = 'channel';
    if (channel.is_im) type = 'dm';
    else if (channel.is_group) type = 'group';

    return {
      channelId: channel.id,
      name: channel.name,
      type,
      memberCount: channel.num_members,
      description: channel.topic?.value,
      botIsMember: true, // We're in it if we can query it
    };
  }

  async listChannels(): Promise<ChannelInfo[]> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    const result = await this.app.client.conversations.list();

    return result.channels.map((channel) => {
      let type: ChannelInfo['type'] = 'channel';
      if (channel.is_im) type = 'dm';
      else if (channel.is_group) type = 'group';

      return {
        channelId: channel.id,
        name: channel.name,
        type,
        memberCount: channel.num_members,
      };
    });
  }

  async addReaction(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    // Remove colons if present
    const emojiName = emoji.replace(/:/g, '');

    await this.app.client.reactions.add({
      channel: channelId,
      timestamp: messageId,
      name: emojiName,
    });
  }

  async getUserInfo(userId: string): Promise<{
    userId: string;
    userName: string;
    displayName?: string;
    avatarUrl?: string;
    isBot?: boolean;
  }> {
    if (!this.app) {
      throw new Error('Not connected');
    }

    const result = await this.app.client.users.info({ user: userId });
    const user = result.user;

    return {
      userId: user.id,
      userName: user.name,
      displayName: user.real_name,
      avatarUrl: user.profile?.image_72,
      isBot: user.is_bot,
    };
  }

  // ============================================================================
  // Slack-specific helpers
  // ============================================================================

  private buildSlackBlocks(message: OutboundChannelMessage): SlackBlock[] {
    const blocks: SlackBlock[] = [];

    // Text content block
    if (message.content) {
      blocks.push({
        type: 'section',
        text: {
          type: message.formatting?.markdown ? 'mrkdwn' : 'plain_text',
          text: this.truncateContent(message.content, 3000), // Slack limit
        },
      });
    }

    // Code blocks
    if (message.formatting?.codeBlocks) {
      for (const codeBlock of message.formatting.codeBlocks) {
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${codeBlock.language}\n${codeBlock.code}\n\`\`\``,
          },
        });
      }
    }

    // Interactive elements (buttons, selects)
    if (message.interactiveElements?.length) {
      const actionBlock: SlackBlock = {
        type: 'actions',
        elements: message.interactiveElements.map((el) =>
          this.convertToSlackElement(el)
        ),
      };
      blocks.push(actionBlock);
    }

    return blocks;
  }

  private convertToSlackElement(element: InteractiveElement): SlackBlockElement {
    switch (element.type) {
      case 'button':
        return {
          type: 'button',
          text: {
            type: 'plain_text',
            text: element.label,
            emoji: true,
          },
          action_id: element.actionId,
          style: element.style === 'danger' ? 'danger' : element.style === 'primary' ? 'primary' : undefined,
          value: element.actionId,
        };

      case 'select':
        return {
          type: 'static_select',
          action_id: element.actionId,
          options: element.options?.map((opt) => ({
            text: { type: 'plain_text', text: opt.label },
            value: opt.value,
          })),
        };

      default:
        return {
          type: 'button',
          text: { type: 'plain_text', text: element.label },
          action_id: element.actionId,
        };
    }
  }
}
