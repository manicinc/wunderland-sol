/**
 * @fileoverview Unit tests for Gateway WebSocket module
 * @module @framers/rabbithole/gateway/__tests__
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebSocket, WebSocketServer as WSSServer } from 'ws';
import { GatewayClient } from '../gateway/GatewayClient.js';
import type {
    RequestFrame,
    ResponseFrame,
    EventFrame,
    WsHelloOk,
    WsConnectParams,
} from '../gateway/types.js';
import {
    WS_PROTOCOL_VERSION,
    WsErrorCodes,
} from '../gateway/types.js';

describe('GatewayClient', () => {
    let mockServer: WSSServer | null = null;
    let client: GatewayClient;
    const TEST_PORT = 19999;
    const TEST_URL = `ws://localhost:${TEST_PORT}`;

    beforeEach(() => {
        client = new GatewayClient({ url: TEST_URL, autoReconnect: false });
    });

    afterEach(async () => {
        try {
            client.disconnect();
        } catch {
            // ignore
        }
        if (mockServer) {
            await new Promise<void>((resolve) => {
                mockServer!.close(() => resolve());
            });
            mockServer = null;
        }
    });

    describe('constructor', () => {
        it('should create client with options', () => {
            const customClient = new GatewayClient({
                url: 'ws://example.com',
                token: 'test-token',
                clientId: 'test-client',
                clientName: 'Test Client',
                autoReconnect: true,
                maxReconnectAttempts: 5,
            });

            expect(customClient).toBeDefined();
            expect(customClient.isConnected).toBe(false);
            expect(customClient.currentSessionId).toBeNull();
        });
    });

    describe('connect', () => {
        it('should connect to server and receive hello', async () => {
            // Create mock server
            mockServer = new WSSServer({ port: TEST_PORT });

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const hello: WsHelloOk = {
                            version: WS_PROTOCOL_VERSION,
                            sessionId: 'test-session-123',
                            serverTime: new Date().toISOString(),
                            features: ['rooms'],
                        };
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: hello,
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            // Wait for server to be ready
            await new Promise((r) => setTimeout(r, 100));

            const hello = await client.connect();

            expect(hello.version).toBe(WS_PROTOCOL_VERSION);
            expect(hello.sessionId).toBe('test-session-123');
            expect(client.isConnected).toBe(true);
            expect(client.currentSessionId).toBe('test-session-123');
        });

        it('should throw when already connected', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();

            await expect(client.connect()).rejects.toThrow('Already connected');
        });
    });

    describe('request', () => {
        it('should send request and receive response', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });
            let didConnect = false;

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        didConnect = true;
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    } else if (msg.method === 'echo' && didConnect) {
                        const response: ResponseFrame = {
                            id: msg.id ?? '',
                            result: { echo: msg.params },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();

            const result = await client.request<{ echo: unknown }>('echo', { message: 'hello' });
            expect(result.echo).toEqual({ message: 'hello' });
        });

        it('should throw when not connected', async () => {
            await expect(client.request('test')).rejects.toThrow('Not connected');
        });
    });

    describe('events', () => {
        it('should receive events from server', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });
            let serverWs: WebSocket | null = null;

            mockServer.on('connection', (ws) => {
                serverWs = ws;
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();

            const events: unknown[] = [];
            client.on('notification', (data) => {
                events.push(data);
            });

            // Send event from server
            const event: EventFrame = {
                event: 'notification',
                data: { message: 'Hello!' },
            };
            serverWs!.send(JSON.stringify(event));

            await new Promise((r) => setTimeout(r, 50));

            expect(events).toHaveLength(1);
            expect(events[0]).toEqual({ message: 'Hello!' });
        });

        it('should unsubscribe from events', async () => {
            const events: unknown[] = [];
            const handler = (data: unknown) => events.push(data);

            const unsubscribe = client.on('test', handler);

            // Unsubscribe
            unsubscribe();

            // Verify handler is removed
            client.off('test', handler);
        });
    });

    describe('room management', () => {
        it('should join and leave rooms', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    } else if (msg.method === 'join') {
                        const response: ResponseFrame = {
                            id: msg.id ?? '',
                            result: { joined: (msg.params as { roomId: string }).roomId },
                        };
                        ws.send(JSON.stringify(response));
                    } else if (msg.method === 'leave') {
                        const response: ResponseFrame = {
                            id: msg.id ?? '',
                            result: { left: (msg.params as { roomId: string }).roomId },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();

            await client.join('room-123');
            await client.leave('room-123');
            // If no error, test passes
        });
    });

    describe('ping', () => {
        it('should ping server and measure latency', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    } else if (msg.method === 'ping') {
                        const response: ResponseFrame = {
                            id: msg.id ?? '',
                            result: { pong: true },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();

            const latency = await client.ping();
            expect(latency).toBeGreaterThanOrEqual(0);
            expect(latency).toBeLessThan(1000);
        });
    });

    describe('disconnect', () => {
        it('should disconnect cleanly', async () => {
            mockServer = new WSSServer({ port: TEST_PORT });

            mockServer.on('connection', (ws) => {
                ws.on('message', (data) => {
                    const msg = JSON.parse(data.toString()) as RequestFrame;
                    if (msg.method === 'connect') {
                        const response: ResponseFrame = {
                            id: msg.id ?? 'connect',
                            result: { version: 1, sessionId: 'test', serverTime: new Date().toISOString() },
                        };
                        ws.send(JSON.stringify(response));
                    }
                });
            });

            await new Promise((r) => setTimeout(r, 100));
            await client.connect();
            expect(client.isConnected).toBe(true);

            client.disconnect();

            await new Promise((r) => setTimeout(r, 50));
            expect(client.isConnected).toBe(false);
            expect(client.currentSessionId).toBeNull();
        });
    });
});

describe('WsErrorCodes', () => {
    it('should have standard JSON-RPC error codes', () => {
        expect(WsErrorCodes.PARSE_ERROR).toBe(-32700);
        expect(WsErrorCodes.INVALID_REQUEST).toBe(-32600);
        expect(WsErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
        expect(WsErrorCodes.INVALID_PARAMS).toBe(-32602);
        expect(WsErrorCodes.INTERNAL_ERROR).toBe(-32603);
    });

    it('should have custom error codes', () => {
        expect(WsErrorCodes.UNAUTHORIZED).toBe(4001);
        expect(WsErrorCodes.FORBIDDEN).toBe(4003);
        expect(WsErrorCodes.NOT_FOUND).toBe(4004);
        expect(WsErrorCodes.RATE_LIMITED).toBe(4029);
        expect(WsErrorCodes.SESSION_EXPIRED).toBe(4401);
    });
});

describe('WS Protocol Constants', () => {
    it('should have correct protocol version', () => {
        expect(WS_PROTOCOL_VERSION).toBe(1);
    });
});
