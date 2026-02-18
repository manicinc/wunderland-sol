/**
 * HTTP Polling Transport Implementation.
 *
 * Fallback sync transport using HTTP long-polling.
 * Works through firewalls and proxies that block WebSocket.
 *
 * @packageDocumentation
 */

import {
  BaseTransport,
  TransportError,
  TransportErrorCodes,
  type TransportOptions,
} from './transport';
import type { SyncMessage } from '../protocol/messages';
import { isSyncMessage } from '../protocol/messages';

/**
 * HTTP-specific transport options.
 */
export interface HttpTransportOptions extends TransportOptions {
  /** Polling interval in milliseconds */
  pollingInterval?: number;

  /** Maximum messages to fetch per poll */
  maxMessagesPerPoll?: number;

  /** Enable long-polling (server holds connection) */
  longPolling?: boolean;

  /** Long-polling timeout in milliseconds */
  longPollTimeout?: number;

  /** Use fetch or XMLHttpRequest */
  fetchImplementation?: typeof fetch;
}

/**
 * HTTP transport for sync with polling.
 *
 * Provides reliable sync over HTTP with:
 * - Regular or long-polling modes
 * - Automatic retry with exponential backoff
 * - Request batching
 * - Configurable polling intervals
 *
 * @example
 * ```typescript
 * const transport = new HttpTransport({
 *   endpoint: 'https://sync.example.com/api/sync',
 *   authToken: 'bearer-token',
 *   pollingInterval: 5000,
 *   longPolling: true,
 * });
 *
 * transport.on('message', ({ message }) => {
 *   handleSyncMessage(message);
 * });
 *
 * await transport.connect();
 * ```
 */
export class HttpTransport extends BaseTransport {
  readonly type = 'http' as const;

  private _pollTimer: ReturnType<typeof setTimeout> | null = null;
  private _abortController: AbortController | null = null;
  private _isPolling = false;
  private _httpOptions: Required<HttpTransportOptions>;
  private _lastEventId: string | null = null;
  private _messageQueue: SyncMessage[] = [];
  private _flushTimer: ReturnType<typeof setTimeout> | null = null;
  private _pendingRequests: Map<string, {
    resolve: (msg: SyncMessage) => void;
    reject: (err: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = new Map();

  constructor(options: HttpTransportOptions) {
    super(options);

    this._httpOptions = {
      ...this._options,
      pollingInterval: options.pollingInterval ?? 5000,
      maxMessagesPerPoll: options.maxMessagesPerPoll ?? 100,
      longPolling: options.longPolling ?? true,
      longPollTimeout: options.longPollTimeout ?? 30000,
      fetchImplementation: options.fetchImplementation ?? globalThis.fetch?.bind(globalThis),
    };
  }

  /**
   * Connect (start polling).
   */
  async connect(): Promise<void> {
    this.checkDisposed();

    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    this.setState('connecting');

    try {
      // Verify connection with a sync check
      await this._syncCheck();

      this.setState('connected');
      this._stats.connectedAt = Date.now();
      this.emit('connected', { timestamp: Date.now() });

      // Start polling loop
      this._startPolling();
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /**
   * Disconnect (stop polling).
   */
  async disconnect(reason = 'client disconnect'): Promise<void> {
    this._stopPolling();
    this._clearPendingRequests(new TransportError(
      reason,
      TransportErrorCodes.DISPOSED,
      { recoverable: false }
    ));

    this.setState('disconnected');
    this.emit('disconnected', { reason, wasClean: true });
  }

  /**
   * Send a sync message.
   */
  async send(message: SyncMessage): Promise<void> {
    this.checkDisposed();

    if (this._state !== 'connected') {
      throw new TransportError(
        'Not connected',
        TransportErrorCodes.SEND_FAILED,
        { recoverable: true }
      );
    }

    // Add to queue for batched sending
    this._messageQueue.push(message);
    this._scheduleFlush();
  }

  /**
   * Send a message and wait for a response.
   */
  async request(message: SyncMessage, timeout?: number): Promise<SyncMessage> {
    this.checkDisposed();

    const requestId = message.messageId;
    const timeoutMs = timeout ?? this._options.requestTimeout;

    return new Promise<SyncMessage>((resolve, reject) => {
      const timer = setTimeout(() => {
        this._pendingRequests.delete(requestId);
        reject(new TransportError(
          'Request timed out',
          TransportErrorCodes.REQUEST_TIMEOUT,
          { recoverable: true }
        ));
      }, timeoutMs);

      this._pendingRequests.set(requestId, { resolve, reject, timer });

      this.send(message).catch((error) => {
        clearTimeout(timer);
        this._pendingRequests.delete(requestId);
        reject(error);
      });
    });
  }

  /**
   * Perform initial sync check to verify connectivity.
   */
  private async _syncCheck(): Promise<void> {
    const url = `${this._options.endpoint}/check`;

    try {
      const response = await this._fetch(url, {
        method: 'GET',
        timeout: this._options.connectionTimeout,
      });

      if (!response.ok) {
        throw new TransportError(
          `Sync check failed: ${response.status}`,
          response.status === 401 || response.status === 403
            ? TransportErrorCodes.AUTH_FAILED
            : TransportErrorCodes.SERVER_ERROR,
          { recoverable: response.status >= 500 }
        );
      }
    } catch (error) {
      if (error instanceof TransportError) throw error;

      throw new TransportError(
        'Connection failed',
        TransportErrorCodes.CONNECTION_FAILED,
        { recoverable: true, cause: error as Error }
      );
    }
  }

  /**
   * Start the polling loop.
   */
  private _startPolling(): void {
    if (this._isPolling) return;
    this._isPolling = true;
    this._poll();
  }

  /**
   * Stop the polling loop.
   */
  private _stopPolling(): void {
    this._isPolling = false;

    if (this._pollTimer) {
      clearTimeout(this._pollTimer);
      this._pollTimer = null;
    }

    if (this._abortController) {
      this._abortController.abort();
      this._abortController = null;
    }

    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = null;
    }
  }

  /**
   * Poll for new messages.
   */
  private async _poll(): Promise<void> {
    if (!this._isPolling || this._disposed) return;

    this._abortController = new AbortController();

    try {
      const messages = await this._fetchMessages();

      for (const message of messages) {
        this._handleMessage(message);
      }

      // Schedule next poll
      this._pollTimer = setTimeout(() => this._poll(), this._httpOptions.pollingInterval);

    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Cancelled, don't retry
        return;
      }

      console.warn('[HttpTransport] Poll error:', error);
      this.emit('error', {
        error: error as Error,
        recoverable: true,
      });

      // Retry with backoff
      if (this._isPolling && this._options.autoReconnect) {
        this._stats.reconnectAttempts++;
        const delay = this.calculateReconnectDelay(this._stats.reconnectAttempts);

        this.emit('reconnecting', {
          attempt: this._stats.reconnectAttempts,
          delay,
        });

        this._pollTimer = setTimeout(() => this._poll(), delay);
      } else {
        this.setState('error');
      }
    }
  }

  /**
   * Fetch messages from server.
   */
  private async _fetchMessages(): Promise<SyncMessage[]> {
    const url = new URL(`${this._options.endpoint}/poll`);

    if (this._lastEventId) {
      url.searchParams.set('lastEventId', this._lastEventId);
    }

    url.searchParams.set('limit', String(this._httpOptions.maxMessagesPerPoll));

    if (this._httpOptions.longPolling) {
      url.searchParams.set('timeout', String(this._httpOptions.longPollTimeout));
    }

    const response = await this._fetch(url.toString(), {
      method: 'GET',
      timeout: this._httpOptions.longPolling
        ? this._httpOptions.longPollTimeout + 5000
        : this._options.requestTimeout,
      signal: this._abortController?.signal,
    });

    if (!response.ok) {
      throw new TransportError(
        `Poll failed: ${response.status}`,
        TransportErrorCodes.SERVER_ERROR,
        { recoverable: response.status >= 500 }
      );
    }

    const data = await response.json() as {
      messages: unknown[];
      lastEventId?: string;
    };

    if (data.lastEventId) {
      this._lastEventId = data.lastEventId;
    }

    const messages: SyncMessage[] = [];

    for (const msg of data.messages) {
      if (isSyncMessage(msg)) {
        messages.push(msg);
        this._stats.messagesReceived++;
      }
    }

    return messages;
  }

  /**
   * Handle an incoming message.
   */
  private _handleMessage(message: SyncMessage): void {
    // Check if this is a response to a pending request
    if ('inResponseTo' in message && message.inResponseTo) {
      const pending = this._pendingRequests.get(message.inResponseTo as string);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingRequests.delete(message.inResponseTo as string);
        pending.resolve(message);
        return;
      }
    }

    // Handle ack messages
    if (message.type === 'ack') {
      const pending = this._pendingRequests.get(message.ackMessageId);
      if (pending) {
        clearTimeout(pending.timer);
        this._pendingRequests.delete(message.ackMessageId);
        pending.resolve(message);
      }
      return;
    }

    // Emit for general handling
    this.emit('message', { message, receivedAt: Date.now() });
  }

  /**
   * Schedule message queue flush.
   */
  private _scheduleFlush(): void {
    if (this._flushTimer) return;

    // Flush after a short delay to allow batching
    this._flushTimer = setTimeout(() => {
      this._flushTimer = null;
      this._flushQueue().catch((error) => {
        console.error('[HttpTransport] Flush error:', error);
      });
    }, 50);
  }

  /**
   * Flush the message queue to server.
   */
  private async _flushQueue(): Promise<void> {
    if (this._messageQueue.length === 0) return;

    const messages = this._messageQueue.splice(0, 100); // Send up to 100 at a time

    try {
      const response = await this._fetch(`${this._options.endpoint}/push`, {
        method: 'POST',
        body: JSON.stringify({ messages }),
        timeout: this._options.requestTimeout,
      });

      if (!response.ok) {
        // Put messages back in queue for retry
        this._messageQueue.unshift(...messages);
        throw new TransportError(
          `Push failed: ${response.status}`,
          TransportErrorCodes.SEND_FAILED,
          { recoverable: response.status >= 500 }
        );
      }

      this._stats.messagesSent += messages.length;

      // Process any immediate responses
      const data = await response.json() as { responses?: unknown[] };

      if (data.responses) {
        for (const resp of data.responses) {
          if (isSyncMessage(resp)) {
            this._handleMessage(resp);
          }
        }
      }

      // If more messages queued, flush again
      if (this._messageQueue.length > 0) {
        this._scheduleFlush();
      }

    } catch (error) {
      if (error instanceof TransportError) throw error;

      // Put messages back for retry
      this._messageQueue.unshift(...messages);
      throw new TransportError(
        'Failed to send messages',
        TransportErrorCodes.SEND_FAILED,
        { recoverable: true, cause: error as Error }
      );
    }
  }

  /**
   * Make an HTTP request.
   */
  private async _fetch(
    url: string,
    options: {
      method: 'GET' | 'POST';
      body?: string;
      timeout?: number;
      signal?: AbortSignal;
    }
  ): Promise<Response> {
    const fetchFn = this._httpOptions.fetchImplementation;

    if (!fetchFn) {
      throw new TransportError(
        'Fetch not available',
        TransportErrorCodes.NETWORK_ERROR,
        { recoverable: false }
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this._options.headers,
    };

    if (this._options.authToken) {
      headers['Authorization'] = `Bearer ${this._options.authToken}`;
    }

    // Create timeout abort if needed
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let abortController: AbortController | undefined;

    if (options.timeout && !options.signal) {
      abortController = new AbortController();
      timeoutId = setTimeout(() => abortController!.abort(), options.timeout);
    }

    try {
      const response = await fetchFn(url, {
        method: options.method,
        headers,
        body: options.body,
        signal: options.signal ?? abortController?.signal,
      });

      return response;

    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Clear all pending requests.
   */
  private _clearPendingRequests(error: Error): void {
    for (const [id, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pendingRequests.clear();
  }
}

/**
 * Create an HTTP transport instance.
 */
export const createHttpTransport = (
  options: HttpTransportOptions
): HttpTransport => {
  return new HttpTransport(options);
};
