/**
 * @fileoverview Gateway WebSocket Client
 * @module @framers/rabbithole/gateway/GatewayClient
 *
 * WebSocket client for connecting to RabbitHole gateway.
 */

import { randomUUID } from 'crypto';
import { WebSocket } from 'ws';
import type {
    RequestFrame,
    ResponseFrame,
    EventFrame,
    WsClientOptions,
    WsConnectParams,
    WsHelloOk,
} from './types.js';
import {
    WS_PROTOCOL_VERSION,
    WS_DEFAULT_REQUEST_TIMEOUT_MS,
    WS_DEFAULT_RECONNECT_BACKOFF_MS,
    WS_DEFAULT_MAX_RECONNECT_ATTEMPTS,
} from './types.js';

// ============================================================================
// TYPES
// ============================================================================

interface PendingRequest {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
}

type EventHandler = (data: unknown) => void;

// ============================================================================
// GATEWAY CLIENT
// ============================================================================

/**
 * Gateway WebSocket client for real-time communication.
 */
export class GatewayClient {
    private ws: WebSocket | null = null;
    private opts: WsClientOptions;
    private pending = new Map<string, PendingRequest>();
    private eventHandlers = new Map<string, Set<EventHandler>>();
    private sessionId: string | null = null;
    private closed = false;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private seq = 0;

    constructor(opts: WsClientOptions) {
        this.opts = {
            autoReconnect: true,
            maxReconnectAttempts: WS_DEFAULT_MAX_RECONNECT_ATTEMPTS,
            reconnectBackoffMs: WS_DEFAULT_RECONNECT_BACKOFF_MS,
            requestTimeoutMs: WS_DEFAULT_REQUEST_TIMEOUT_MS,
            ...opts,
        };
    }

    /**
     * Connect to the gateway.
     */
    async connect(): Promise<WsHelloOk> {
        if (this.ws) {
            throw new Error('Already connected');
        }

        this.closed = false;

        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.opts.url);

                this.ws.on('open', () => {
                    this.sendConnect()
                        .then((hello) => {
                            this.sessionId = hello.sessionId;
                            this.reconnectAttempts = 0;
                            this.opts.onConnect?.(hello);
                            resolve(hello);
                        })
                        .catch(reject);
                });

                this.ws.on('message', (data: Buffer) => {
                    this.handleMessage(data.toString());
                });

                this.ws.on('close', (code: number, reason: Buffer) => {
                    this.handleClose(code, reason.toString());
                });

                this.ws.on('error', (err: Error) => {
                    this.opts.onError?.(err);
                    if (!this.sessionId) {
                        reject(err);
                    }
                });

                this.ws.on('ping', () => {
                    this.ws?.pong();
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Disconnect from the gateway.
     */
    disconnect(): void {
        this.closed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }
        this.sessionId = null;
        this.flushPendingErrors(new Error('Disconnected'));
    }

    /**
     * Send a request and wait for response.
     */
    async request<T = unknown>(method: string, params?: unknown): Promise<T> {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected');
        }

        const id = randomUUID();
        const frame: RequestFrame = {
            id,
            seq: ++this.seq,
            method,
            params,
        };

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(`Request timeout: ${method}`));
            }, this.opts.requestTimeoutMs);

            this.pending.set(id, {
                resolve: resolve as (value: unknown) => void,
                reject,
                timeoutId,
            });

            this.ws!.send(JSON.stringify(frame));
        });
    }

    /**
     * Subscribe to events.
     */
    on(event: string, handler: EventHandler): () => void {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);

        // Return unsubscribe function
        return () => {
            this.eventHandlers.get(event)?.delete(handler);
        };
    }

    /**
     * Unsubscribe from events.
     */
    off(event: string, handler?: EventHandler): void {
        if (handler) {
            this.eventHandlers.get(event)?.delete(handler);
        } else {
            this.eventHandlers.delete(event);
        }
    }

    /**
     * Join a room.
     */
    async join(roomId: string): Promise<void> {
        await this.request('join', { roomId });
    }

    /**
     * Leave a room.
     */
    async leave(roomId: string): Promise<void> {
        await this.request('leave', { roomId });
    }

    /**
     * Ping the server.
     */
    async ping(): Promise<number> {
        const start = Date.now();
        await this.request('ping');
        return Date.now() - start;
    }

    /**
     * Get connection state.
     */
    get isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get current session ID.
     */
    get currentSessionId(): string | null {
        return this.sessionId;
    }

    // Private methods

    private async sendConnect(): Promise<WsHelloOk> {
        const params: WsConnectParams = {
            version: WS_PROTOCOL_VERSION,
            token: this.opts.token,
            clientId: this.opts.clientId,
            clientName: this.opts.clientName,
        };

        const frame: RequestFrame = {
            id: 'connect',
            method: 'connect',
            params,
        };

        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pending.delete('connect');
                reject(new Error('Connection timeout'));
            }, this.opts.requestTimeoutMs);

            this.pending.set('connect', {
                resolve: resolve as (value: unknown) => void,
                reject,
                timeoutId,
            });

            this.ws!.send(JSON.stringify(frame));
        });
    }

    private handleMessage(raw: string): void {
        try {
            const message = JSON.parse(raw);

            // Response frame
            if ('id' in message && 'result' in message || 'error' in message) {
                const response = message as ResponseFrame;
                const pending = this.pending.get(response.id);
                if (pending) {
                    clearTimeout(pending.timeoutId);
                    this.pending.delete(response.id);
                    if (response.error) {
                        pending.reject(new Error(response.error.message));
                    } else {
                        pending.resolve(response.result);
                    }
                }
                return;
            }

            // Event frame
            if ('event' in message) {
                const event = message as EventFrame;
                this.emitEvent(event.event, event.data);
                this.opts.onEvent?.(event.event, event.data);
            }
        } catch (err) {
            console.error('[GatewayClient] Failed to parse message:', err);
        }
    }

    private handleClose(code: number, reason: string): void {
        this.ws = null;
        this.opts.onDisconnect?.(code, reason);
        this.flushPendingErrors(new Error(`Connection closed: ${code} ${reason}`));

        // Attempt reconnect
        if (!this.closed && this.opts.autoReconnect) {
            if (this.reconnectAttempts < (this.opts.maxReconnectAttempts ?? 10)) {
                this.scheduleReconnect();
            }
        }
    }

    private scheduleReconnect(): void {
        this.reconnectAttempts++;
        const delay = this.opts.reconnectBackoffMs! * Math.pow(1.5, this.reconnectAttempts - 1);
        console.log(`[GatewayClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect().catch((err) => {
                console.error('[GatewayClient] Reconnect failed:', err.message);
            });
        }, delay);
    }

    private flushPendingErrors(err: Error): void {
        for (const pending of this.pending.values()) {
            clearTimeout(pending.timeoutId);
            pending.reject(err);
        }
        this.pending.clear();
    }

    private emitEvent(event: string, data: unknown): void {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            for (const handler of handlers) {
                try {
                    handler(data);
                } catch (err) {
                    console.error(`[GatewayClient] Event handler error for ${event}:`, err);
                }
            }
        }
    }
}
