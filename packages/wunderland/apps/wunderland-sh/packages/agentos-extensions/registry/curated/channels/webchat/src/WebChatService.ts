/**
 * @fileoverview Lightweight WebChat message broker.
 *
 * Unlike Telegram or Discord, WebChat does NOT use an external SDK.
 * It acts as a thin event broker between the AgentOS channel system and
 * the WunderlandGateway (Socket.IO), which handles the actual transport.
 *
 * The backend wires the `onSend` callback to `gateway.broadcastChannelMessage`
 * and calls `injectMessage()` when `channel:send:internal` events arrive.
 */

/**
 * Inbound message shape injected by the gateway bridge.
 */
export interface WebChatInboundMessage {
  /** Unique message ID from the client. */
  messageId: string;
  /** Conversation/room ID. */
  conversationId: string;
  /** Sender info. */
  sender: {
    id: string;
    displayName?: string;
    username?: string;
    avatarUrl?: string;
  };
  /** Plain text content. */
  text: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Optional metadata (e.g., client version, device info). */
  metadata?: Record<string, unknown>;
}

/**
 * Outbound message metadata passed alongside text.
 */
export interface WebChatSendMetadata {
  /** Typing indicator state. */
  typing?: boolean;
  /** Read receipt for a specific messageId. */
  readReceipt?: string;
  /** Any additional platform-specific data. */
  [key: string]: unknown;
}

/** Handler for inbound messages from the gateway. */
export type InboundHandler = (message: WebChatInboundMessage) => void | Promise<void>;

/** Callback wired by the backend to bridge outbound messages to the gateway. */
export type OnSendCallback = (
  conversationId: string,
  text: string,
  metadata?: WebChatSendMetadata,
) => void | Promise<void>;

export class WebChatService {
  private running = false;
  private inboundHandlers: InboundHandler[] = [];
  private sendCallback: OnSendCallback | null = null;

  /**
   * Register the outbound send callback. The backend sets this to bridge
   * messages to WunderlandGateway's `broadcastChannelMessage`.
   */
  set onSend(callback: OnSendCallback | null) {
    this.sendCallback = callback;
  }

  get onSend(): OnSendCallback | null {
    return this.sendCallback;
  }

  /** Whether the service is currently active. */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Mark the service as running. No external connections to establish.
   */
  async initialize(): Promise<void> {
    if (this.running) return;
    this.running = true;
  }

  /**
   * Shut down the service, clearing all handlers.
   */
  async shutdown(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.inboundHandlers = [];
    this.sendCallback = null;
  }

  /**
   * Send an outbound message via the registered callback.
   * If no callback is registered, the message is silently dropped.
   *
   * @param conversationId - Target conversation/room ID.
   * @param text - Message text to send.
   * @param metadata - Optional metadata (typing indicators, read receipts, etc.).
   */
  async sendMessage(
    conversationId: string,
    text: string,
    metadata?: WebChatSendMetadata,
  ): Promise<void> {
    if (!this.running) {
      throw new Error('WebChatService is not running');
    }

    if (this.sendCallback) {
      await this.sendCallback(conversationId, text, metadata);
    }
  }

  /**
   * Register a handler for inbound messages from the gateway.
   */
  onInbound(handler: InboundHandler): void {
    this.inboundHandlers.push(handler);
  }

  /**
   * Remove a previously registered inbound handler.
   */
  offInbound(handler: InboundHandler): void {
    const idx = this.inboundHandlers.indexOf(handler);
    if (idx >= 0) this.inboundHandlers.splice(idx, 1);
  }

  /**
   * Inject an inbound message from the gateway bridge.
   * Called by the backend when `channel:send:internal` events arrive
   * from the WunderlandGateway (Socket.IO).
   *
   * Dispatches the message to all registered inbound handlers.
   */
  injectMessage(message: WebChatInboundMessage): void {
    for (const handler of this.inboundHandlers) {
      Promise.resolve(handler(message)).catch((err) => {
        console.error('[WebChatService] Inbound handler error:', err);
      });
    }
  }
}
