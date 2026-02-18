/**
 * @fileoverview Gmail API wrapper using Google OAuth2.
 * Handles authentication, message CRUD, search, and label management.
 *
 * @module @framers/agentos-ext-email-gmail/GmailService
 */

import { google, type gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GmailConfig {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  to: string[];
  cc?: string[];
  date: string;
  snippet: string;
  body: string;
  labelIds: string[];
  isUnread: boolean;
}

export interface EmailLabel {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number;
  messagesUnread?: number;
}

export interface ListMessagesOptions {
  query?: string;
  labelIds?: string[];
  maxResults?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a header value from a Gmail message payload.
 */
function getHeader(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  if (!headers) return '';
  const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? '';
}

/**
 * Parses a comma-separated address list into individual addresses.
 */
function parseAddressList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
}

/**
 * Recursively extracts the text body from a MIME message payload.
 * Prefers text/plain; falls back to text/html with tags stripped.
 */
function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) return '';

  // Single-part message
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, 'base64url').toString('utf-8');
    if (payload.mimeType === 'text/plain') return decoded;
    if (payload.mimeType === 'text/html') return stripHtml(decoded);
    return decoded;
  }

  // Multipart — walk parts, prefer text/plain
  if (payload.parts && payload.parts.length > 0) {
    // First pass: look for text/plain
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return Buffer.from(part.body.data, 'base64url').toString('utf-8');
      }
    }
    // Second pass: look for text/html
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtml(Buffer.from(part.body.data, 'base64url').toString('utf-8'));
      }
    }
    // Third pass: recurse into nested multipart
    for (const part of payload.parts) {
      if (part.mimeType?.startsWith('multipart/')) {
        const nested = extractBody(part);
        if (nested) return nested;
      }
    }
  }

  return '';
}

/**
 * Naive HTML tag stripper for fallback body extraction.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts a raw Gmail API message into a normalized EmailMessage.
 */
function parseMessage(msg: gmail_v1.Schema$Message): EmailMessage {
  const headers = msg.payload?.headers;
  return {
    id: msg.id ?? '',
    threadId: msg.threadId ?? '',
    subject: getHeader(headers, 'Subject'),
    from: getHeader(headers, 'From'),
    to: parseAddressList(getHeader(headers, 'To')),
    cc: parseAddressList(getHeader(headers, 'Cc')) || undefined,
    date: getHeader(headers, 'Date'),
    snippet: msg.snippet ?? '',
    body: extractBody(msg.payload),
    labelIds: msg.labelIds ?? [],
    isUnread: (msg.labelIds ?? []).includes('UNREAD'),
  };
}

/**
 * Builds an RFC 2822 formatted email string and base64url-encodes it
 * for the Gmail API send endpoint.
 */
function buildRawEmail(opts: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  cc?: string;
  bcc?: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}): string {
  const lines: string[] = [];
  if (opts.from) lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  if (opts.cc) lines.push(`Cc: ${opts.cc}`);
  if (opts.bcc) lines.push(`Bcc: ${opts.bcc}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);
  lines.push('Content-Type: text/plain; charset="UTF-8"');
  lines.push('MIME-Version: 1.0');
  lines.push('');
  lines.push(opts.body);

  const raw = lines.join('\r\n');
  return Buffer.from(raw, 'utf-8').toString('base64url');
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GmailService {
  private oauth2Client: OAuth2Client | null = null;
  private gmail: gmail_v1.Gmail | null = null;
  private initialized = false;
  private readonly config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  // ---- Lifecycle ----------------------------------------------------------

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.oauth2Client = new OAuth2Client(
      this.config.clientId,
      this.config.clientSecret,
    );

    this.oauth2Client.setCredentials({
      refresh_token: this.config.refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    this.gmail = null;
    this.oauth2Client = null;
    this.initialized = false;
  }

  get isInitialized(): boolean {
    return this.initialized;
  }

  private get api(): gmail_v1.Gmail {
    if (!this.gmail) throw new Error('GmailService not initialized. Call initialize() first.');
    return this.gmail;
  }

  // ---- Profile ------------------------------------------------------------

  async getProfile(): Promise<{ emailAddress: string; messagesTotal: number; threadsTotal: number }> {
    const res = await this.api.users.getProfile({ userId: 'me' });
    return {
      emailAddress: res.data.emailAddress ?? '',
      messagesTotal: res.data.messagesTotal ?? 0,
      threadsTotal: res.data.threadsTotal ?? 0,
    };
  }

  // ---- Messages -----------------------------------------------------------

  /**
   * Lists messages matching optional query and label filters.
   * Returns full message details (not just IDs) by batch-fetching each result.
   */
  async listMessages(options: ListMessagesOptions = {}): Promise<EmailMessage[]> {
    const { query, labelIds, maxResults = 10 } = options;

    const listRes = await this.api.users.messages.list({
      userId: 'me',
      q: query,
      labelIds: labelIds,
      maxResults,
    });

    const messageStubs = listRes.data.messages ?? [];
    if (messageStubs.length === 0) return [];

    // Batch-fetch full message details
    const messages = await Promise.all(
      messageStubs.map(async (stub) => {
        const full = await this.api.users.messages.get({
          userId: 'me',
          id: stub.id!,
          format: 'full',
        });
        return parseMessage(full.data);
      }),
    );

    return messages;
  }

  /**
   * Retrieves a single message by ID with full content.
   */
  async getMessage(messageId: string): Promise<EmailMessage> {
    const res = await this.api.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return parseMessage(res.data);
  }

  /**
   * Composes and sends a new email.
   */
  async sendMessage(opts: {
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
  }): Promise<{ id: string; threadId: string }> {
    const profile = await this.getProfile();
    const raw = buildRawEmail({
      from: profile.emailAddress,
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      cc: opts.cc,
      bcc: opts.bcc,
    });

    const res = await this.api.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });

    return {
      id: res.data.id ?? '',
      threadId: res.data.threadId ?? '',
    };
  }

  /**
   * Replies to an existing message within its thread.
   * Preserves In-Reply-To and References headers for proper threading.
   */
  async replyToMessage(messageId: string, body: string): Promise<{ id: string; threadId: string }> {
    // Fetch original message for threading headers
    const original = await this.api.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });

    const headers = original.data.payload?.headers;
    const messageIdHeader = getHeader(headers, 'Message-ID') || getHeader(headers, 'Message-Id');
    const subject = getHeader(headers, 'Subject');
    const from = getHeader(headers, 'From');
    const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;

    const profile = await this.getProfile();
    const raw = buildRawEmail({
      from: profile.emailAddress,
      to: from,
      subject: replySubject,
      body,
      inReplyTo: messageIdHeader,
      references: messageIdHeader,
    });

    const res = await this.api.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: original.data.threadId ?? undefined,
      },
    });

    return {
      id: res.data.id ?? '',
      threadId: res.data.threadId ?? '',
    };
  }

  /**
   * Searches messages using Gmail query syntax.
   * Delegates to listMessages with the query parameter.
   */
  async searchMessages(query: string, maxResults = 10): Promise<EmailMessage[]> {
    return this.listMessages({ query, maxResults });
  }

  // ---- Labels -------------------------------------------------------------

  /**
   * Lists all labels (folders) in the user's mailbox.
   */
  async listLabels(): Promise<EmailLabel[]> {
    const res = await this.api.users.labels.list({ userId: 'me' });
    const labels = res.data.labels ?? [];

    // Fetch detail for each label to get message counts
    const detailed = await Promise.all(
      labels.map(async (label) => {
        try {
          const detail = await this.api.users.labels.get({
            userId: 'me',
            id: label.id!,
          });
          return {
            id: detail.data.id ?? '',
            name: detail.data.name ?? '',
            type: detail.data.type ?? 'user',
            messagesTotal: detail.data.messagesTotal ?? undefined,
            messagesUnread: detail.data.messagesUnread ?? undefined,
          } as EmailLabel;
        } catch {
          return {
            id: label.id ?? '',
            name: label.name ?? '',
            type: label.type ?? 'user',
          } as EmailLabel;
        }
      }),
    );

    return detailed;
  }
}
