/**
 * @fileoverview WhatsApp SDK wrapper using @whiskeysockets/baileys.
 * Handles socket lifecycle, message sending, and rate limiting.
 */

// Baileys depends on git-hosted packages. To keep `pnpm install` usable in offline
// and minimal environments, this extension treats Baileys as a peer dependency
// and loads it lazily at runtime.
let cachedBaileys: any | null = null;

function loadBaileys(): any {
  if (cachedBaileys) return cachedBaileys;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    cachedBaileys = require('@whiskeysockets/baileys');
    return cachedBaileys;
  } catch (error) {
    cachedBaileys = null;
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Missing peer dependency "@whiskeysockets/baileys". Install it to enable WhatsApp support (e.g. \`pnpm add @whiskeysockets/baileys\`). Original error: ${details}`,
    );
  }
}

/** @internal Set or reset the cached Baileys module — used by tests to ensure mock isolation across vitest threads. */
export function _setBaileysForTesting(mod: any): void {
  cachedBaileys = mod;
}

type WASocket = any;
type WAMessage = any;
type AuthenticationState = any;

export interface WhatsAppChannelConfig {
  sessionData: string;
  phoneNumber?: string;
  reconnect?: { maxRetries: number; delayMs: number };
  rateLimit?: { maxRequests: number; windowMs: number };
}

interface RateState {
  count: number;
  resetAt: number;
}

type MessageHandler = (message: WAMessage, isGroup: boolean) => void;

export class WhatsAppService {
  private sock: WASocket | null = null;
  private running = false;
  private messageHandlers: Array<MessageHandler> = [];
  private rateMap = new Map<string, RateState>();
  private readonly config: Required<
    Pick<WhatsAppChannelConfig, 'reconnect' | 'rateLimit'>
  > & WhatsAppChannelConfig;

  constructor(config: WhatsAppChannelConfig) {
    this.config = {
      ...config,
      reconnect: config.reconnect ?? { maxRetries: 5, delayMs: 3000 },
      rateLimit: config.rateLimit ?? { maxRequests: 30, windowMs: 1000 },
    };
  }

  async initialize(): Promise<void> {
    if (this.running) return;

    // Parse session data into auth state
    const authState = this.parseSessionData(this.config.sessionData);

    const baileys = loadBaileys();
    const makeWASocket = baileys?.default ?? baileys;
    const DisconnectReason = baileys?.DisconnectReason;

    this.sock = makeWASocket({
      auth: authState,
      printQRInTerminal: false,
    });

    // Wire up connection updates
    this.sock.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const loggedOutCode = (DisconnectReason as any)?.loggedOut;
        const shouldReconnect = loggedOutCode == null ? true : statusCode !== loggedOutCode;

        if (shouldReconnect && this.config.reconnect.maxRetries > 0) {
          setTimeout(() => {
            this.initialize().catch((err) => {
              console.error('[WhatsAppService] Reconnect failed:', err);
            });
          }, this.config.reconnect.delayMs);
        } else {
          this.running = false;
        }
      } else if (connection === 'open') {
        this.running = true;
      }
    });

    // Wire up inbound message handler
    this.sock.ev.on(
      'messages.upsert',
      ({ messages, type }: { messages: WAMessage[]; type: string }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const jid = msg.key.remoteJid ?? '';
        const isGroup = this.isGroupJid(jid);

        for (const handler of this.messageHandlers) {
          handler(msg, isGroup);
        }
      }
      },
    );

    this.running = true;
  }

  async shutdown(): Promise<void> {
    if (!this.running || !this.sock) return;
    this.sock.ev.removeAllListeners('messages.upsert');
    this.sock.ev.removeAllListeners('connection.update');
    try {
      this.sock.end(undefined);
    } catch {
      // Socket may already be closed or not fully connected
    }
    this.running = false;
    this.sock = null;
  }

  get isRunning(): boolean {
    return this.running;
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  offMessage(handler: MessageHandler): void {
    const idx = this.messageHandlers.indexOf(handler);
    if (idx >= 0) this.messageHandlers.splice(idx, 1);
  }

  async sendMessage(
    jid: string,
    text: string,
    options?: {
      quotedMessageId?: string;
    },
  ): Promise<{ key: { id: string }; messageTimestamp: number }> {
    this.ensureSocket();
    await this.checkRateLimit(jid);

    const quoted = options?.quotedMessageId
      ? { key: { remoteJid: jid, id: options.quotedMessageId } }
      : undefined;

    const result = await this.sock!.sendMessage(jid, { text }, { quoted } as any);
    return {
      key: { id: result?.key?.id ?? '' },
      messageTimestamp: typeof result?.messageTimestamp === 'number'
        ? result.messageTimestamp
        : Math.floor(Date.now() / 1000),
    };
  }

  async sendImage(
    jid: string,
    url: string,
    caption?: string,
  ): Promise<{ key: { id: string } }> {
    this.ensureSocket();
    await this.checkRateLimit(jid);

    const result = await this.sock!.sendMessage(jid, {
      image: { url },
      caption: caption ?? undefined,
    });

    return { key: { id: result?.key?.id ?? '' } };
  }

  async sendDocument(
    jid: string,
    url: string,
    filename?: string,
  ): Promise<{ key: { id: string } }> {
    this.ensureSocket();
    await this.checkRateLimit(jid);

    const result = await this.sock!.sendMessage(jid, {
      document: { url },
      fileName: filename ?? 'document',
    });

    return { key: { id: result?.key?.id ?? '' } };
  }

  async sendPresenceUpdate(jid: string, type: 'composing' | 'paused'): Promise<void> {
    this.ensureSocket();
    await this.sock!.sendPresenceUpdate(type, jid);
  }

  /**
   * Determines whether a JID represents a group conversation.
   * Groups end with `@g.us`, DMs end with `@s.whatsapp.net`.
   */
  isGroupJid(jid: string): boolean {
    return jid.endsWith('@g.us');
  }

  // ── Private ──

  private ensureSocket(): void {
    if (!this.sock) throw new Error('WhatsAppService not initialized');
  }

  private parseSessionData(sessionData: string): AuthenticationState {
    try {
      const parsed = JSON.parse(sessionData);
      return parsed as AuthenticationState;
    } catch {
      throw new Error(
        'Invalid sessionData: must be a valid JSON string representing WhatsApp auth state.',
      );
    }
  }

  private async checkRateLimit(key: string): Promise<void> {
    const now = Date.now();
    const state = this.rateMap.get(key);
    if (!state || now >= state.resetAt) {
      this.rateMap.set(key, { count: 1, resetAt: now + this.config.rateLimit.windowMs });
      return;
    }
    if (state.count >= this.config.rateLimit.maxRequests) {
      const waitMs = state.resetAt - now;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      this.rateMap.set(key, { count: 1, resetAt: Date.now() + this.config.rateLimit.windowMs });
      return;
    }
    state.count++;
  }
}
