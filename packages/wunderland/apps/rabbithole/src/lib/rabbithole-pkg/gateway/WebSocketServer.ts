/**
 * @fileoverview Gateway WebSocket Server
 * @module @framers/rabbithole/gateway/WebSocketServer
 *
 * WebSocket server for real-time communication with RabbitHole clients.
 */

import { randomUUID } from 'crypto';
import { WebSocketServer as WSSServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type {
    RequestFrame,
    ResponseFrame,
    EventFrame,
    WsServerOptions,
    WsConnectParams,
    WsHelloOk,
    WsErrorShape,
} from './types.js';
import {
    WS_PROTOCOL_VERSION,
    WS_DEFAULT_PORT,
    WS_DEFAULT_HEARTBEAT_MS,
    WS_DEFAULT_TIMEOUT_MS,
    WS_DEFAULT_MAX_PAYLOAD_BYTES,
    WsErrorCodes,
} from './types.js';

// ============================================================================
// TYPES
// ============================================================================

interface ClientConnection {
    ws: WebSocket;
    sessionId: string;
    userId: string | null;
    clientId?: string;
    clientName?: string;
    connectedAt: Date;
    lastActivityAt: Date;
    isAlive: boolean;
    rooms: Set<string>;
}

// PendingRequest is used on the client side, not server

type MethodHandler = (
    params: unknown,
    client: ClientConnection,
) => Promise<unknown> | unknown;

// ============================================================================
// GATEWAY SERVER
// ============================================================================

export interface GatewayWebSocketServer {
    /** Close the server */
    close: () => Promise<void>;
    /** Broadcast event to all clients */
    broadcast: (event: string, data?: unknown) => void;
    /** Send event to specific session */
    sendToSession: (sessionId: string, event: string, data?: unknown) => boolean;
    /** Send to all clients in a room */
    sendToRoom: (roomId: string, event: string, data?: unknown) => number;
    /** Get connected client count */
    clientCount: () => number;
    /** Register a method handler */
    registerMethod: (method: string, handler: MethodHandler) => void;
    /** Get server info */
    getInfo: () => { port: number; clients: number; uptime: number };
}

/**
 * Start the gateway WebSocket server.
 */
export async function startWebSocketServer(
    options: WsServerOptions = {},
): Promise<GatewayWebSocketServer> {
    const port = options.port ?? WS_DEFAULT_PORT;
    const host = options.host ?? '0.0.0.0';
    const heartbeatInterval = options.heartbeatIntervalMs ?? WS_DEFAULT_HEARTBEAT_MS;
    const connectionTimeout = options.connectionTimeoutMs ?? WS_DEFAULT_TIMEOUT_MS;
    const maxPayload = options.maxPayloadBytes ?? WS_DEFAULT_MAX_PAYLOAD_BYTES;

    const clients = new Map<string, ClientConnection>();
    const rooms = new Map<string, Set<string>>(); // roomId -> sessionIds
    const methods = new Map<string, MethodHandler>();
    const startTime = Date.now();

    // Create WebSocket server
    const wss = new WSSServer({
        port,
        host,
        path: options.path ?? '/ws',
        maxPayload,
    });

    console.log(`[Gateway] WebSocket server starting on ws://${host}:${port}${options.path ?? '/ws'}`);

    // Heartbeat interval
    const heartbeatTimer = setInterval(() => {
        for (const [sessionId, client] of clients) {
            if (!client.isAlive) {
                console.log(`[Gateway] Client ${sessionId} failed heartbeat, disconnecting`);
                client.ws.terminate();
                clients.delete(sessionId);
                options.onClientDisconnect?.(sessionId, 1006, 'Heartbeat timeout');
                continue;
            }
            client.isAlive = false;
            client.ws.ping();
        }
    }, heartbeatInterval);

    // Handle new connections
    wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
        const sessionId = randomUUID();
        let authenticated = false;
        let connectionTimeoutId: NodeJS.Timeout | null = null;

        // Set connection timeout
        connectionTimeoutId = setTimeout(() => {
            if (!authenticated) {
                console.log(`[Gateway] Connection timeout for ${sessionId}`);
                sendError(ws, WsErrorCodes.UNAUTHORIZED, 'Connection timeout', sessionId);
                ws.close(4001, 'Connection timeout');
            }
        }, connectionTimeout);

        // Handle messages
        ws.on('message', async (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString());

                // If not authenticated, expect connect message
                if (!authenticated) {
                    if (message.method === 'connect') {
                        await handleConnect(ws, message.params as WsConnectParams, sessionId, req);
                        authenticated = true;
                        if (connectionTimeoutId) {
                            clearTimeout(connectionTimeoutId);
                            connectionTimeoutId = null;
                        }
                    } else {
                        sendError(ws, WsErrorCodes.UNAUTHORIZED, 'Must connect first', message.id);
                    }
                    return;
                }

                // Handle authenticated messages
                const client = clients.get(sessionId);
                if (!client) {
                    sendError(ws, WsErrorCodes.SESSION_EXPIRED, 'Session not found', message.id);
                    return;
                }

                client.lastActivityAt = new Date();

                if ('method' in message) {
                    await handleRequest(message as RequestFrame, client);
                }
            } catch (err) {
                console.error('[Gateway] Message parse error:', err);
                sendError(ws, WsErrorCodes.PARSE_ERROR, 'Invalid JSON');
            }
        });

        // Handle pong
        ws.on('pong', () => {
            const client = clients.get(sessionId);
            if (client) {
                client.isAlive = true;
            }
        });

        // Handle close
        ws.on('close', (code: number, reason: Buffer) => {
            if (connectionTimeoutId) {
                clearTimeout(connectionTimeoutId);
            }
            const client = clients.get(sessionId);
            if (client) {
                // Remove from all rooms
                for (const roomId of client.rooms) {
                    const room = rooms.get(roomId);
                    if (room) {
                        room.delete(sessionId);
                        if (room.size === 0) {
                            rooms.delete(roomId);
                        }
                    }
                }
                clients.delete(sessionId);
                options.onClientDisconnect?.(sessionId, code, reason.toString());
            }
        });

        // Handle errors
        ws.on('error', (err: Error) => {
            console.error(`[Gateway] WebSocket error for ${sessionId}:`, err.message);
        });
    });

    // Handle connect
    async function handleConnect(
        ws: WebSocket,
        params: WsConnectParams,
        sessionId: string,
        _req: IncomingMessage,
    ): Promise<void> {
        let userId: string | null = null;
        let userInfo: { id: string; email?: string; name?: string } | null = null;

        // Validate token if provided
        if (params.token && options.validateToken) {
            const tokenResult = await options.validateToken(params.token);
            if (!tokenResult) {
                sendError(ws, WsErrorCodes.UNAUTHORIZED, 'Invalid token', undefined);
                ws.close(4001, 'Invalid token');
                return;
            }
            userId = tokenResult.userId;
            userInfo = { id: tokenResult.userId, email: tokenResult.email, name: tokenResult.name };
        }

        // Create client connection
        const client: ClientConnection = {
            ws,
            sessionId,
            userId,
            clientId: params.clientId,
            clientName: params.clientName,
            connectedAt: new Date(),
            lastActivityAt: new Date(),
            isAlive: true,
            rooms: new Set(),
        };

        clients.set(sessionId, client);

        // Send hello response
        const hello: WsHelloOk = {
            version: WS_PROTOCOL_VERSION,
            sessionId,
            serverTime: new Date().toISOString(),
            features: ['rooms', 'broadcast'],
            user: userInfo ?? undefined,
        };

        const response: ResponseFrame = {
            id: 'connect',
            result: hello,
        };

        ws.send(JSON.stringify(response));
        options.onClientConnect?.(sessionId, userId);
        console.log(`[Gateway] Client connected: ${sessionId} (user: ${userId ?? 'anonymous'})`);
    }

    // Handle request
    async function handleRequest(
        request: RequestFrame,
        client: ClientConnection,
    ): Promise<void> {
        const { method, params, id } = request;

        // Built-in methods
        if (method === 'ping') {
            sendResponse(client.ws, id, { pong: true, time: Date.now() });
            return;
        }

        if (method === 'join') {
            const roomId = (params as { roomId?: string })?.roomId;
            if (!roomId) {
                sendError(client.ws, WsErrorCodes.INVALID_PARAMS, 'roomId required', id);
                return;
            }
            client.rooms.add(roomId);
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId)!.add(client.sessionId);
            sendResponse(client.ws, id, { joined: roomId });
            return;
        }

        if (method === 'leave') {
            const roomId = (params as { roomId?: string })?.roomId;
            if (!roomId) {
                sendError(client.ws, WsErrorCodes.INVALID_PARAMS, 'roomId required', id);
                return;
            }
            client.rooms.delete(roomId);
            const room = rooms.get(roomId);
            if (room) {
                room.delete(client.sessionId);
                if (room.size === 0) {
                    rooms.delete(roomId);
                }
            }
            sendResponse(client.ws, id, { left: roomId });
            return;
        }

        // Custom method handler
        const handler = methods.get(method);
        if (handler) {
            try {
                const result = await handler(params, client);
                sendResponse(client.ws, id, result);
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Handler error';
                sendError(client.ws, WsErrorCodes.INTERNAL_ERROR, message, id);
            }
            return;
        }

        sendError(client.ws, WsErrorCodes.METHOD_NOT_FOUND, `Unknown method: ${method}`, id);
    }

    // Helper functions
    function sendResponse(ws: WebSocket, id: string | undefined, result: unknown): void {
        if (ws.readyState !== WebSocket.OPEN) return;
        const response: ResponseFrame = { id: id ?? '', result };
        ws.send(JSON.stringify(response));
    }

    function sendError(
        ws: WebSocket,
        code: number,
        message: string,
        id?: string,
    ): void {
        if (ws.readyState !== WebSocket.OPEN) return;
        const error: WsErrorShape = { code, message };
        const response: ResponseFrame = { id: id ?? '', error };
        ws.send(JSON.stringify(response));
    }

    function sendEvent(ws: WebSocket, event: string, data?: unknown): void {
        if (ws.readyState !== WebSocket.OPEN) return;
        const frame: EventFrame = { event, data };
        ws.send(JSON.stringify(frame));
    }

    // Public API
    const server: GatewayWebSocketServer = {
        async close() {
            clearInterval(heartbeatTimer);
            for (const client of clients.values()) {
                client.ws.close(1000, 'Server shutdown');
            }
            clients.clear();
            rooms.clear();
            return new Promise((resolve) => {
                wss.close(() => {
                    console.log('[Gateway] WebSocket server closed');
                    resolve();
                });
            });
        },

        broadcast(event: string, data?: unknown) {
            for (const client of clients.values()) {
                sendEvent(client.ws, event, data);
            }
        },

        sendToSession(sessionId: string, event: string, data?: unknown): boolean {
            const client = clients.get(sessionId);
            if (client) {
                sendEvent(client.ws, event, data);
                return true;
            }
            return false;
        },

        sendToRoom(roomId: string, event: string, data?: unknown): number {
            const room = rooms.get(roomId);
            if (!room) return 0;
            let count = 0;
            for (const sessionId of room) {
                const client = clients.get(sessionId);
                if (client) {
                    sendEvent(client.ws, event, data);
                    count++;
                }
            }
            return count;
        },

        clientCount() {
            return clients.size;
        },

        registerMethod(method: string, handler: MethodHandler) {
            methods.set(method, handler);
        },

        getInfo() {
            return {
                port,
                clients: clients.size,
                uptime: Date.now() - startTime,
            };
        },
    };

    return server;
}
