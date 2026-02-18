/**
 * @fileoverview Slack SDK wrapper using @slack/bolt.
 * Handles app lifecycle, message sending, file uploads, and event routing.
 */

import { App } from '@slack/bolt';
import type { MessageEvent } from '@slack/bolt';

export interface SlackChannelConfig {
  botToken: string;
  signingSecret: string;
  appToken?: string;
  socketMode?: boolean;
  port?: number;
}

export class SlackService {
  private app: App | null = null;
  private running = false;
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private readonly config: SlackChannelConfig;

  constructor(config: SlackChannelConfig) {
    this.config = {
      ...config,
      socketMode: config.socketMode ?? !!config.appToken,
    };
  }

  async initialize(): Promise<void> {
    if (this.running) return;

    this.app = new App({
      token: this.config.botToken,
      signingSecret: this.config.signingSecret,
      socketMode: this.config.socketMode,
      appToken: this.config.socketMode ? this.config.appToken : undefined,
    });

    // Wire up inbound message handler
    this.app.message(async ({ message }) => {
      // Only process standard user messages (not bot messages, changed messages, etc.)
      const msg = message as MessageEvent;
      if (msg.subtype) return;

      for (const handler of this.messageHandlers) {
        handler(msg);
      }
    });

    await this.app.start(this.config.port ?? 3000);
    this.running = true;
  }

  async shutdown(): Promise<void> {
    if (!this.running || !this.app) return;
    await this.app.stop();
    this.running = false;
    this.app = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  private get client() {
    if (!this.app) throw new Error('SlackService not initialized');
    return this.app.client;
  }

  onMessage(handler: (event: MessageEvent) => void): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: (event: MessageEvent) => void): void {
    const idx = this.messageHandlers.indexOf(handler);
    if (idx >= 0) this.messageHandlers.splice(idx, 1);
  }

  async sendMessage(
    channel: string,
    text: string,
    options?: {
      blocks?: object[];
      threadTs?: string;
    },
  ): Promise<{ ts: string; channel: string }> {
    const result = await this.client.chat.postMessage({
      channel,
      text,
      blocks: options?.blocks as any,
      thread_ts: options?.threadTs,
    });

    return {
      ts: result.ts!,
      channel: result.channel!,
    };
  }

  async uploadFile(
    channel: string,
    url: string,
    filename?: string,
  ): Promise<{ fileId: string }> {
    const result = await this.client.files.uploadV2({
      channel_id: channel,
      file: url,
      filename: filename ?? 'upload',
    });

    // files.uploadV2 returns a file object or array of file objects
    const file = Array.isArray(result.files) ? result.files[0] : result.file;
    return { fileId: (file as any)?.id ?? 'unknown' };
  }

  async updateMessage(
    channel: string,
    ts: string,
    text: string,
    options?: { blocks?: object[] },
  ): Promise<void> {
    await this.client.chat.update({
      channel,
      ts,
      text,
      blocks: options?.blocks as any,
    });
  }

  async deleteMessage(channel: string, ts: string): Promise<void> {
    await this.client.chat.delete({
      channel,
      ts,
    });
  }

  async addReaction(channel: string, ts: string, name: string): Promise<void> {
    await this.client.reactions.add({
      channel,
      timestamp: ts,
      name,
    });
  }

  async getConversationInfo(channel: string): Promise<{
    name?: string;
    isGroup: boolean;
    memberCount?: number;
    topic?: string;
    purpose?: string;
    metadata?: Record<string, unknown>;
  }> {
    const result = await this.client.conversations.info({ channel });
    const ch = result.channel as any;
    const isGroup = ch?.is_group || ch?.is_mpim || ch?.is_channel;

    let memberCount: number | undefined;
    if (isGroup) {
      memberCount = ch?.num_members;
    }

    return {
      name: ch?.name ?? ch?.name_normalized,
      isGroup: !!isGroup,
      memberCount,
      topic: ch?.topic?.value,
      purpose: ch?.purpose?.value,
      metadata: {
        is_im: ch?.is_im,
        is_mpim: ch?.is_mpim,
        is_channel: ch?.is_channel,
        is_group: ch?.is_group,
        is_private: ch?.is_private,
      },
    };
  }

  /**
   * Slack does not support bot typing indicators natively.
   * This is a no-op stub for API compatibility.
   */
  async setTyping(_channel: string): Promise<void> {
    // No-op: Slack API does not expose a typing indicator for bots.
  }

  async getBotInfo(): Promise<{ userId: string; botId?: string; teamId?: string }> {
    const result = await this.client.auth.test();
    return {
      userId: result.user_id!,
      botId: result.bot_id,
      teamId: result.team_id,
    };
  }
}
