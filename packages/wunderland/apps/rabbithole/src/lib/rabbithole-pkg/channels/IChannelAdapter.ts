/**
 * @fileoverview Channel Adapter Interface for RabbitHole
 * @module @framers/rabbithole/channels/IChannelAdapter
 *
 * Defines the contract for external messaging channel adapters
 * that bridge platforms like Slack, Discord, WhatsApp, and Telegram
 * to the Wunderland agent system.
 */

// ============================================================================
// Channel Types
// ============================================================================

/** Supported channel platforms */
export type ChannelPlatform = 'slack' | 'discord' | 'whatsapp' | 'telegram';

/** Channel connection status */
export type ChannelStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

/** Message delivery status */
export type DeliveryStatus = {
  status: 'pending' | 'delivered' | 'failed' | 'rate_limited';
  messageId?: string;
  error?: string;
  timestamp: Date;
};

// ============================================================================
// Message Types
// ============================================================================

/** Incoming message from external channel */
export interface InboundChannelMessage {
  /** Unique message ID from the platform */
  platformMessageId: string;

  /** Channel/platform type */
  platform: ChannelPlatform;

  /** Workspace/server/group ID */
  workspaceId: string;

  /** Channel/conversation ID */
  channelId: string;

  /** Thread ID (if threaded) */
  threadId?: string;

  /** User ID on the platform */
  userId: string;

  /** User display name */
  userName: string;

  /** User avatar URL (if available) */
  userAvatarUrl?: string;

  /** Message content */
  content: string;

  /** Attachments */
  attachments?: ChannelAttachment[];

  /** Mentions */
  mentions?: ChannelMention[];

  /** Whether the bot was mentioned */
  botMentioned?: boolean;

  /** Whether this is a direct message */
  isDirectMessage?: boolean;

  /** Raw platform metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp when received */
  receivedAt: Date;
}

/** Outbound message to external channel */
export interface OutboundChannelMessage {
  /** Target channel ID */
  channelId: string;

  /** Thread ID (for replies) */
  threadId?: string;

  /** Message content */
  content: string;

  /** Rich formatting options */
  formatting?: MessageFormatting;

  /** Attachments */
  attachments?: ChannelAttachment[];

  /** Interactive elements (buttons, etc.) */
  interactiveElements?: InteractiveElement[];

  /** Whether to send as ephemeral (only visible to one user) */
  ephemeral?: boolean;

  /** Target user for ephemeral messages */
  ephemeralUserId?: string;
}

/** Attachment types */
export interface ChannelAttachment {
  /** Attachment type */
  type: 'file' | 'image' | 'audio' | 'video' | 'link';

  /** URL of the attachment */
  url: string;

  /** Filename */
  name?: string;

  /** MIME type */
  mimeType?: string;

  /** File size in bytes */
  size?: number;

  /** Preview/thumbnail URL */
  thumbnailUrl?: string;
}

/** User mention */
export interface ChannelMention {
  /** User ID */
  userId: string;

  /** User display name */
  userName: string;

  /** Start index in content */
  startIndex: number;

  /** End index in content */
  endIndex: number;
}

/** Message formatting options */
export interface MessageFormatting {
  /** Enable markdown parsing */
  markdown?: boolean;

  /** Code blocks */
  codeBlocks?: Array<{ language: string; code: string }>;

  /** Rich embeds (Discord-style) */
  embeds?: MessageEmbed[];
}

/** Rich embed for messages */
export interface MessageEmbed {
  /** Embed title */
  title?: string;

  /** Embed description */
  description?: string;

  /** Embed color (hex) */
  color?: string;

  /** Embed URL */
  url?: string;

  /** Thumbnail image */
  thumbnail?: { url: string };

  /** Footer text */
  footer?: { text: string; iconUrl?: string };

  /** Fields */
  fields?: Array<{ name: string; value: string; inline?: boolean }>;

  /** Timestamp */
  timestamp?: Date;
}

// ============================================================================
// Interactive Elements
// ============================================================================

/** Interactive element types */
export interface InteractiveElement {
  /** Element type */
  type: 'button' | 'select' | 'text_input';

  /** Action ID for callbacks */
  actionId: string;

  /** Display label */
  label: string;

  /** Button style */
  style?: 'primary' | 'danger' | 'secondary';

  /** Options for select elements */
  options?: Array<{ value: string; label: string }>;

  /** Placeholder text */
  placeholder?: string;

  /** Whether disabled */
  disabled?: boolean;
}

/** User action callback (button click, selection, etc.) */
export interface ChannelUserAction {
  /** Action ID from the interactive element */
  actionId: string;

  /** User who performed the action */
  userId: string;

  /** User display name */
  userName: string;

  /** Channel where action occurred */
  channelId: string;

  /** Message ID containing the interactive element */
  messageId: string;

  /** Selected value(s) */
  value: string | string[];

  /** Additional action data */
  metadata?: Record<string, unknown>;

  /** Timestamp */
  timestamp: Date;
}

// ============================================================================
// Configuration
// ============================================================================

/** Channel adapter configuration */
export interface ChannelAdapterConfig {
  /** Platform type */
  platform: ChannelPlatform;

  /** Platform credentials */
  credentials: ChannelCredentials;

  /** Tenant ID */
  tenantId: string;

  /** Project ID (optional) */
  projectId?: string;

  /** Webhook URL for incoming messages */
  webhookUrl?: string;

  /** Rate limits */
  rateLimits?: {
    messagesPerMinute?: number;
    messagesPerSecond?: number;
  };

  /** Reconnection settings */
  reconnection?: {
    enabled: boolean;
    maxAttempts?: number;
    baseDelayMs?: number;
  };

  /** Debug logging */
  debug?: boolean;
}

/** Platform-specific credentials */
export type ChannelCredentials =
  | SlackCredentials
  | DiscordCredentials
  | WhatsAppCredentials
  | TelegramCredentials;

export interface SlackCredentials {
  platform: 'slack';
  botToken: string;
  appToken?: string;
  signingSecret: string;
}

export interface DiscordCredentials {
  platform: 'discord';
  botToken: string;
  applicationId: string;
  publicKey: string;
}

export interface WhatsAppCredentials {
  platform: 'whatsapp';
  phoneNumberId: string;
  accessToken: string;
  webhookVerifyToken: string;
  businessAccountId?: string;
}

export interface TelegramCredentials {
  platform: 'telegram';
  botToken: string;
  webhookSecret?: string;
}

// ============================================================================
// Approval Request
// ============================================================================

/** Approval request configuration */
export interface ApprovalRequestConfig {
  /** Request ID */
  requestId: string;

  /** Title */
  title: string;

  /** Description */
  description: string;

  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Custom approve button label */
  approveLabel?: string;

  /** Custom reject button label */
  rejectLabel?: string;

  /** Alternative actions */
  alternatives?: Array<{ id: string; label: string }>;

  /** Timeout in ms */
  timeoutMs?: number;

  /** Additional context to display */
  context?: Record<string, unknown>;
}

// ============================================================================
// Channel Info
// ============================================================================

/** Channel information */
export interface ChannelInfo {
  /** Channel ID */
  channelId: string;

  /** Channel name */
  name: string;

  /** Channel type */
  type: 'dm' | 'group' | 'channel' | 'thread';

  /** Member count (for groups/channels) */
  memberCount?: number;

  /** Whether bot is a member */
  botIsMember?: boolean;

  /** Channel description/topic */
  description?: string;
}

// ============================================================================
// Channel Adapter Interface
// ============================================================================

/**
 * Interface for channel adapters.
 * Each platform implements this to bridge messages to/from the Wunderland agent system.
 */
export interface IChannelAdapter {
  /** Platform identifier */
  readonly platform: ChannelPlatform;

  /** Current connection status */
  readonly status: ChannelStatus;

  /** Tenant ID this adapter serves */
  readonly tenantId: string;

  /** Unique adapter instance ID */
  readonly adapterId: string;

  /**
   * Initialize and connect to the channel.
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the channel.
   */
  disconnect(): Promise<void>;

  /**
   * Send a message to the channel.
   */
  sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus>;

  /**
   * Send an approval request with interactive buttons.
   */
  sendApprovalRequest(
    channelId: string,
    approval: ApprovalRequestConfig
  ): Promise<DeliveryStatus>;

  /**
   * Update an existing message.
   */
  updateMessage(
    channelId: string,
    messageId: string,
    content: string,
    formatting?: MessageFormatting
  ): Promise<void>;

  /**
   * Delete a message.
   */
  deleteMessage(channelId: string, messageId: string): Promise<void>;

  /**
   * Register handler for incoming messages.
   */
  onMessage(handler: (message: InboundChannelMessage) => Promise<void>): void;

  /**
   * Register handler for user actions (button clicks, etc.).
   */
  onUserAction(handler: (action: ChannelUserAction) => Promise<void>): void;

  /**
   * Register handler for connection status changes.
   */
  onStatusChange?(handler: (status: ChannelStatus) => void): void;

  /**
   * Register handler for errors.
   */
  onError?(handler: (error: Error) => void): void;

  /**
   * Get channel/conversation information.
   */
  getChannelInfo(channelId: string): Promise<ChannelInfo>;

  /**
   * Get list of channels the bot has access to.
   */
  listChannels?(): Promise<ChannelInfo[]>;

  /**
   * Add a reaction to a message.
   */
  addReaction?(
    channelId: string,
    messageId: string,
    emoji: string
  ): Promise<void>;

  /**
   * Get user information.
   */
  getUserInfo?(userId: string): Promise<{
    userId: string;
    userName: string;
    displayName?: string;
    avatarUrl?: string;
    isBot?: boolean;
  }>;
}
