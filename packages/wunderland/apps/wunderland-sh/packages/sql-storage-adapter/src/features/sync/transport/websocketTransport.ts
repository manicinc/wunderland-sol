/**
 * WebSocket Transport Implementation.
 *
 * Real-time bidirectional sync transport using WebSockets.
 * Supports automatic reconnection, heartbeats, and message compression.
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
import { isSyncMessage, createHeartbeatMessage, createAckMessage } from '../protocol/messages';

/**
 * WebSocket-specific transport options.
 */
export interface WebSocketTransportOptions extends TransportOptions {
  /** WebSocket protocols to use */
  protocols?: string[];

  /** Binary message format */
  binaryType?: 'arraybuffer' | 'blob';

  /** Enable ping/pong heartbeats */
  pingPong?: boolean;
}

/**
 * Pending request waiting for response.
 */
interface PendingRequest {
  resolve: (message: SyncMessage) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * WebSocket transport for real-time sync.
 *
 * Provides low-latency bidirectional communication with:
 * - Automatic reconnection with exponential backoff
 * - Request/response correlation
 * - Heartbeat keep-alive
 * - Message compression (gzip)
 *
 * @example
 * ```typescript
 * const transport = new WebSocketTransport({
 *   endpoint: 'wss://sync.example.com/v1/sync',
 *   authToken: 'bearer-token',
 *   autoReconnect: true,
 *   heartbeatInterval: 30000,
 * });
 *
 * transport.on('message', ({ message }) => {
 *   handleSyncMessage(message);
 * });
 *
 * await transport.connect();
 * ```
 */
export class WebSocketTransport extends BaseTransport {
  readonly type = 'websocket' as const;

  private _ws: WebSocket | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _pendingRequests: Map<string, PendingRequest> = new Map();
  private _wsOptions: Required<WebSocketTransportOptions>;
  private _lastPongAt = 0;
  private _shouldReconnect = false;

  constructor(options: WebSocketTransportOptions) {
    super(options);

    this._wsOptions = {
      ...this._options,
      protocols: options.protocols ?? ['sync-v1'],
      binaryType: options.binaryType ?? 'arraybuffer',
      pingPong: options.pingPong ?? true,
    };
  }

  /**
   * Connect to the WebSocket server.
   */
  async connect(): Promise<void> {
    this.checkDisposed();

    if (this._state === 'connected' || this._state === 'connecting') {
      return;
    }

    this.setState('connecting');
    this._shouldReconnect = this._options.autoReconnect;

    try {
      await this._createConnection();
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  async disconnect(reason = 'client disconnect'): Promise<void> {
    this._shouldReconnect = false;
    this._clearTimers();
    this._rejectAllPending(new TransportError(
      'Disconnected',
      TransportErrorCodes.DISPOSED,
      { recoverable: false }
    ));

    if (this._ws) {
      try {
        this._ws.close(1000, reason);
      } catch {
        // Ignore close errors
      }
      this._ws = null;
    }

    this.setState('disconnected');
    this.emit('disconnected', { reason, wasClean: true });
  }

  /**
   * Send a sync message.
   */
  async send(message: SyncMessage): Promise<void> {
    this.checkDisposed();

    if (!this._ws || this._state !== 'connected') {
      throw new TransportError(
        'Not connected',
        TransportErrorCodes.SEND_FAILED,
        { recoverable: true }
      );
    }

    const data = this._serialize(message);

    try {
      this._ws.send(data);
      this._stats.messagesSent++;
      this._stats.bytesSent += data.length;
    } catch (error) {
      throw new TransportError(
        'Failed to send message',
        TransportErrorCodes.SEND_FAILED,
        { recoverable: true, cause: error as Error }
      );
    }
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
   * Create WebSocket connection.
   */
  private _createConnection(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = this._buildUrl();
      const timeout = setTimeout(() => {
        reject(new TransportError(
          'Connection timed out',
          TransportErrorCodes.CONNECTION_TIMEOUT,
          { recoverable: true }
        ));
      }, this._options.connectionTimeout);

      try {
        this._ws = new WebSocket(url, this._wsOptions.protocols);
        this._ws.binaryType = this._wsOptions.binaryType;
      } catch (error) {
        clearTimeout(timeout);
        reject(new TransportError(
          'Failed to create WebSocket',
          TransportErrorCodes.CONNECTION_FAILED,
          { recoverable: true, cause: error as Error }
        ));
        return;
      }

      this._ws.onopen = () => {
        clearTimeout(timeout);
        this.setState('connected');
        this._stats.connectedAt = Date.now();
        this._stats.reconnectAttempts = 0;
        this._startHeartbeat();
        this.emit('connected', { timestamp: Date.now() });
        resolve();
      };

      this._ws.onclose = (event) => {
        clearTimeout(timeout);
        this._handleClose(event);

        if (this._state === 'connecting') {
          reject(new TransportError(
            `Connection closed: ${event.reason || 'unknown'}`,
            TransportErrorCodes.CONNECTION_FAILED,
            { recoverable: true }
          ));
        }
      };

      this._ws.onerror = (event) => {
        const error = new TransportError(
          'WebSocket error',
          TransportErrorCodes.NETWORK_ERROR,
          { recoverable: true }
        );

        this.emit('error', { error, recoverable: true });

        // Note: onclose will be called after onerror
        console.error('[WebSocketTransport] Connection error:', event);
      };

      this._ws.onmessage = (event) => {
        this._handleMessage(event);
      };
    });
  }

  /**
   * Build WebSocket URL with auth token.
   */
  private _buildUrl(): string {
    const url = new URL(this._options.endpoint);

    // Add auth token as query parameter if provided
    if (this._options.authToken) {
      url.searchParams.set('token', this._options.authToken);
    }

    return url.toString();
  }

  /**
   * Handle incoming WebSocket message.
   */
  private _handleMessage(event: MessageEvent): void {
    try {
      const message = this._deserialize(event.data);

      if (!isSyncMessage(message)) {
        console.warn('[WebSocketTransport] Received invalid message:', message);
        return;
      }

      this._stats.messagesReceived++;
      this._stats.bytesReceived += typeof event.data === 'string'
        ? event.data.length
        : (event.data as ArrayBuffer).byteLength;

      // Handle heartbeat responses
      if (message.type === 'heartbeat') {
        this._lastPongAt = Date.now();
        // Send ack for heartbeat
        this.send(createAckMessage(message.messageId, this._options.authToken || 'device'))
          .catch(() => {/* ignore ack send failures */});
        return;
      }

      // Handle ack messages - resolve pending requests
      if (message.type === 'ack') {
        const pending = this._pendingRequests.get(message.ackMessageId);
        if (pending) {
          clearTimeout(pending.timer);
          this._pendingRequests.delete(message.ackMessageId);
          pending.resolve(message);
        }
        return;
      }

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

      // Emit message for general handling
      this.emit('message', { message, receivedAt: Date.now() });

    } catch (error) {
      console.error('[WebSocketTransport] Failed to process message:', error);
      this.emit('error', {
        error: new TransportError(
          'Failed to process message',
          TransportErrorCodes.PROTOCOL_ERROR,
          { recoverable: true, cause: error as Error }
        ),
        recoverable: true,
      });
    }
  }

  /**
   * Handle WebSocket close event.
   */
  private _handleClose(event: CloseEvent): void {
    this._stopHeartbeat();

    const wasConnected = this._state === 'connected';
    const wasClean = event.wasClean;
    const reason = event.reason || `Code: ${event.code}`;

    this.emit('disconnected', { reason, wasClean });

    // Reject all pending requests
    this._rejectAllPending(new TransportError(
      'Connection closed',
      TransportErrorCodes.NETWORK_ERROR,
      { recoverable: this._shouldReconnect }
    ));

    // Attempt reconnection if enabled
    if (this._shouldReconnect && wasConnected) {
      this._scheduleReconnect();
    } else {
      this.setState('disconnected');
    }
  }

  /**
   * Schedule reconnection attempt.
   */
  private _scheduleReconnect(): void {
    if (!this._shouldReconnect || this._disposed) return;

    const maxAttempts = this._options.maxReconnectAttempts;
    if (maxAttempts > 0 && this._stats.reconnectAttempts >= maxAttempts) {
      console.warn('[WebSocketTransport] Max reconnection attempts reached');
      this.setState('error');
      return;
    }

    this._stats.reconnectAttempts++;
    const delay = this.calculateReconnectDelay(this._stats.reconnectAttempts);

    this.setState('reconnecting');
    this.emit('reconnecting', {
      attempt: this._stats.reconnectAttempts,
      delay,
    });

    this._reconnectTimer = setTimeout(async () => {
      if (!this._shouldReconnect || this._disposed) return;

      try {
        await this._createConnection();
      } catch (error) {
        console.warn('[WebSocketTransport] Reconnection failed:', error);
        this._scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Start heartbeat timer.
   */
  private _startHeartbeat(): void {
    if (!this._wsOptions.pingPong || this._options.heartbeatInterval <= 0) {
      return;
    }

    this._lastPongAt = Date.now();

    this._heartbeatTimer = setInterval(() => {
      if (!this._ws || this._state !== 'connected') return;

      // Check if we missed too many heartbeats
      const missedTime = Date.now() - this._lastPongAt;
      if (missedTime > this._options.heartbeatInterval * 3) {
        console.warn('[WebSocketTransport] Heartbeat timeout, reconnecting...');
        this._ws.close(4000, 'Heartbeat timeout');
        return;
      }

      // Send heartbeat
      const heartbeat = createHeartbeatMessage(this._options.authToken || 'device');
      this.send(heartbeat).catch((error) => {
        console.warn('[WebSocketTransport] Failed to send heartbeat:', error);
      });
    }, this._options.heartbeatInterval);
  }

  /**
   * Stop heartbeat timer.
   */
  private _stopHeartbeat(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
  }

  /**
   * Clear all timers.
   */
  private _clearTimers(): void {
    this._stopHeartbeat();

    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  /**
   * Reject all pending requests.
   */
  private _rejectAllPending(error: Error): void {
    for (const [id, pending] of this._pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this._pendingRequests.clear();
  }

  /**
   * Serialize message for transmission.
   */
  private _serialize(message: SyncMessage): string {
    // For now, use JSON. Could add compression/binary later.
    return JSON.stringify(message);
  }

  /**
   * Deserialize received message.
   */
  private _deserialize(data: string | ArrayBuffer): unknown {
    if (typeof data === 'string') {
      return JSON.parse(data);
    }

    // Handle binary (ArrayBuffer)
    const decoder = new TextDecoder();
    const text = decoder.decode(data);
    return JSON.parse(text);
  }

  /**
   * Dispose of the transport.
   */
  async dispose(): Promise<void> {
    this._shouldReconnect = false;
    await super.dispose();
  }
}

/**
 * Create a WebSocket transport instance.
 */
export const createWebSocketTransport = (
  options: WebSocketTransportOptions
): WebSocketTransport => {
  return new WebSocketTransport(options);
};
