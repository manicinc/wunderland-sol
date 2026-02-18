/**
 * Transport Layer Interface.
 *
 * Defines the contract for sync transports (WebSocket, HTTP polling, etc.).
 * Transports handle the low-level communication between sync nodes.
 *
 * @packageDocumentation
 */

import type { SyncMessage } from '../protocol/messages';

/**
 * Transport connection state.
 */
export type TransportState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * Transport configuration options.
 */
export interface TransportOptions {
  /** Server endpoint URL */
  endpoint: string;

  /** Authentication token or API key */
  authToken?: string;

  /** Custom headers for HTTP requests */
  headers?: Record<string, string>;

  /** Connection timeout in milliseconds */
  connectionTimeout?: number;

  /** Request timeout in milliseconds */
  requestTimeout?: number;

  /** Enable automatic reconnection */
  autoReconnect?: boolean;

  /** Initial reconnection delay in milliseconds */
  reconnectDelay?: number;

  /** Maximum reconnection delay in milliseconds */
  maxReconnectDelay?: number;

  /** Maximum reconnection attempts (0 = unlimited) */
  maxReconnectAttempts?: number;

  /** Heartbeat interval in milliseconds (0 = disabled) */
  heartbeatInterval?: number;

  /** Enable message compression */
  compression?: boolean;
}

/**
 * Transport event types.
 */
export type TransportEventType =
  | 'connected'
  | 'disconnected'
  | 'message'
  | 'error'
  | 'reconnecting'
  | 'stateChange';

/**
 * Transport event payloads.
 */
export interface TransportEvents {
  connected: { timestamp: number };
  disconnected: { reason: string; wasClean: boolean };
  message: { message: SyncMessage; receivedAt: number };
  error: { error: Error; recoverable: boolean };
  reconnecting: { attempt: number; delay: number };
  stateChange: { previousState: TransportState; currentState: TransportState };
}

/**
 * Transport event listener.
 */
export type TransportEventListener<T extends TransportEventType> = (
  event: TransportEvents[T]
) => void;

/**
 * Transport statistics.
 */
export interface TransportStats {
  /** Current connection state */
  state: TransportState;

  /** Time when connection was established (epoch ms) */
  connectedAt?: number;

  /** Total messages sent */
  messagesSent: number;

  /** Total messages received */
  messagesReceived: number;

  /** Total bytes sent */
  bytesSent: number;

  /** Total bytes received */
  bytesReceived: number;

  /** Number of reconnection attempts */
  reconnectAttempts: number;

  /** Average round-trip latency in milliseconds */
  averageLatency?: number;

  /** Last error encountered */
  lastError?: Error;
}

/**
 * Transport interface for sync communication.
 *
 * Implementations handle the actual network communication,
 * allowing the sync engine to be transport-agnostic.
 *
 * @example
 * ```typescript
 * const transport = new WebSocketTransport({
 *   endpoint: 'wss://sync.example.com',
 *   authToken: 'bearer-token',
 *   autoReconnect: true,
 * });
 *
 * transport.on('message', ({ message }) => {
 *   console.log('Received:', message);
 * });
 *
 * await transport.connect();
 * await transport.send(handshakeMessage);
 * ```
 */
export interface SyncTransport {
  /** Transport type identifier */
  readonly type: 'websocket' | 'http' | 'custom';

  /** Current connection state */
  readonly state: TransportState;

  /** Whether the transport is currently connected */
  readonly isConnected: boolean;

  /**
   * Connect to the sync server.
   *
   * @throws {TransportError} If connection fails
   */
  connect(): Promise<void>;

  /**
   * Disconnect from the sync server.
   *
   * @param reason - Optional disconnect reason
   */
  disconnect(reason?: string): Promise<void>;

  /**
   * Send a message to the sync server.
   *
   * @param message - The sync message to send
   * @returns Promise that resolves when message is sent
   * @throws {TransportError} If send fails
   */
  send(message: SyncMessage): Promise<void>;

  /**
   * Send a message and wait for a response.
   *
   * @param message - The sync message to send
   * @param timeout - Optional response timeout in milliseconds
   * @returns Promise that resolves with the response message
   * @throws {TransportError} If send fails or times out
   */
  request(message: SyncMessage, timeout?: number): Promise<SyncMessage>;

  /**
   * Register an event listener.
   *
   * @param event - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  on<T extends TransportEventType>(
    event: T,
    listener: TransportEventListener<T>
  ): () => void;

  /**
   * Register a one-time event listener.
   *
   * @param event - Event type to listen for
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  once<T extends TransportEventType>(
    event: T,
    listener: TransportEventListener<T>
  ): () => void;

  /**
   * Get transport statistics.
   */
  getStats(): TransportStats;

  /**
   * Dispose of the transport and release resources.
   */
  dispose(): Promise<void>;
}

/**
 * Transport error with additional context.
 */
export class TransportError extends Error {
  /** Error code for categorization */
  readonly code: string;

  /** Whether the error is recoverable */
  readonly recoverable: boolean;

  /** Original error if wrapping another error */
  readonly cause?: Error;

  constructor(
    message: string,
    code: string,
    options?: { recoverable?: boolean; cause?: Error }
  ) {
    super(message);
    this.name = 'TransportError';
    this.code = code;
    this.recoverable = options?.recoverable ?? false;
    this.cause = options?.cause;
  }
}

/**
 * Common transport error codes.
 */
export const TransportErrorCodes = {
  /** Connection failed */
  CONNECTION_FAILED: 'CONNECTION_FAILED',

  /** Connection timeout */
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',

  /** Authentication failed */
  AUTH_FAILED: 'AUTH_FAILED',

  /** Request timeout */
  REQUEST_TIMEOUT: 'REQUEST_TIMEOUT',

  /** Send failed */
  SEND_FAILED: 'SEND_FAILED',

  /** Server error */
  SERVER_ERROR: 'SERVER_ERROR',

  /** Network error */
  NETWORK_ERROR: 'NETWORK_ERROR',

  /** Protocol error */
  PROTOCOL_ERROR: 'PROTOCOL_ERROR',

  /** Transport disposed */
  DISPOSED: 'DISPOSED',
} as const;

/**
 * Base transport implementation with common functionality.
 */
export abstract class BaseTransport implements SyncTransport {
  abstract readonly type: 'websocket' | 'http' | 'custom';

  protected _state: TransportState = 'disconnected';
  protected _stats: TransportStats;
  protected _options: Required<TransportOptions>;
  protected _disposed = false;

  private _listeners: Map<TransportEventType, Set<TransportEventListener<TransportEventType>>> = new Map();

  constructor(options: TransportOptions) {
    this._options = {
      endpoint: options.endpoint,
      authToken: options.authToken ?? '',
      headers: options.headers ?? {},
      connectionTimeout: options.connectionTimeout ?? 10000,
      requestTimeout: options.requestTimeout ?? 30000,
      autoReconnect: options.autoReconnect ?? true,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectDelay: options.maxReconnectDelay ?? 30000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 0,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      compression: options.compression ?? true,
    };

    this._stats = {
      state: 'disconnected',
      messagesSent: 0,
      messagesReceived: 0,
      bytesSent: 0,
      bytesReceived: 0,
      reconnectAttempts: 0,
    };
  }

  get state(): TransportState {
    return this._state;
  }

  get isConnected(): boolean {
    return this._state === 'connected';
  }

  abstract connect(): Promise<void>;
  abstract disconnect(reason?: string): Promise<void>;
  abstract send(message: SyncMessage): Promise<void>;
  abstract request(message: SyncMessage, timeout?: number): Promise<SyncMessage>;

  on<T extends TransportEventType>(
    event: T,
    listener: TransportEventListener<T>
  ): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    const listeners = this._listeners.get(event)!;
    listeners.add(listener as TransportEventListener<TransportEventType>);

    return () => {
      listeners.delete(listener as TransportEventListener<TransportEventType>);
    };
  }

  once<T extends TransportEventType>(
    event: T,
    listener: TransportEventListener<T>
  ): () => void {
    const wrapper: TransportEventListener<T> = (eventData) => {
      unsubscribe();
      listener(eventData);
    };

    const unsubscribe = this.on(event, wrapper);
    return unsubscribe;
  }

  getStats(): TransportStats {
    return { ...this._stats, state: this._state };
  }

  async dispose(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;

    await this.disconnect('disposed');
    this._listeners.clear();
  }

  /**
   * Emit an event to all registered listeners.
   */
  protected emit<T extends TransportEventType>(
    event: T,
    data: TransportEvents[T]
  ): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    for (const listener of listeners) {
      try {
        (listener as TransportEventListener<T>)(data);
      } catch (error) {
        console.error(`[Transport] Error in ${event} listener:`, error);
      }
    }
  }

  /**
   * Update transport state and emit event.
   */
  protected setState(newState: TransportState): void {
    if (this._state === newState) return;

    const previousState = this._state;
    this._state = newState;
    this._stats.state = newState;

    this.emit('stateChange', { previousState, currentState: newState });
  }

  /**
   * Check if transport is disposed and throw if so.
   */
  protected checkDisposed(): void {
    if (this._disposed) {
      throw new TransportError(
        'Transport has been disposed',
        TransportErrorCodes.DISPOSED,
        { recoverable: false }
      );
    }
  }

  /**
   * Calculate next reconnection delay with exponential backoff.
   */
  protected calculateReconnectDelay(attempt: number): number {
    const delay = Math.min(
      this._options.reconnectDelay * Math.pow(2, attempt - 1),
      this._options.maxReconnectDelay
    );

    // Add jitter (±20%)
    const jitter = delay * 0.2 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }
}
