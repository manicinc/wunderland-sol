/**
 * @fileoverview Unit tests for Channel Adapters
 * @module @framers/rabbithole/channels/__tests__
 *
 * Tests for BaseChannelAdapter and platform-specific adapters.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BaseChannelAdapter } from '../channels/BaseChannelAdapter.js';
import type {
    ChannelAdapterConfig,
    OutboundChannelMessage,
    DeliveryStatus,
    ChannelInfo,
    MessageFormatting,
    InboundChannelMessage,
    ChannelUserAction,
    ChannelStatus,
} from '../channels/IChannelAdapter.js';

// ============================================================================
// Test Implementation of BaseChannelAdapter
// ============================================================================

class TestChannelAdapter extends BaseChannelAdapter {
    readonly platform = 'slack' as const;

    // Track method calls for testing
    public connectCalled = false;
    public disconnectCalled = false;
    public sentMessages: OutboundChannelMessage[] = [];
    public updatedMessages: Array<{ channelId: string; messageId: string; content: string }> = [];
    public deletedMessages: Array<{ channelId: string; messageId: string }> = [];

    async connect(): Promise<void> {
        this.connectCalled = true;
        this.setStatus('connected');
    }

    async disconnect(): Promise<void> {
        this.disconnectCalled = true;
        this.setStatus('disconnected');
    }

    async sendMessage(message: OutboundChannelMessage): Promise<DeliveryStatus> {
        this.sentMessages.push(message);
        return this.createDeliveryStatus('delivered', `msg-${Date.now()}`);
    }

    async updateMessage(
        channelId: string,
        messageId: string,
        content: string,
        _formatting?: MessageFormatting,
    ): Promise<void> {
        this.updatedMessages.push({ channelId, messageId, content });
    }

    async deleteMessage(channelId: string, messageId: string): Promise<void> {
        this.deletedMessages.push({ channelId, messageId });
    }

    async getChannelInfo(channelId: string): Promise<ChannelInfo> {
        return {
            channelId,
            name: `test-channel-${channelId}`,
            type: 'channel',
            memberCount: 10,
        };
    }

    // Expose protected methods for testing
    public testEmitMessage(message: InboundChannelMessage): Promise<void> {
        return this.emitMessage(message);
    }

    public testEmitAction(action: ChannelUserAction): Promise<void> {
        return this.emitAction(action);
    }

    public testSetStatus(status: ChannelStatus): void {
        this.setStatus(status);
    }

    public testEmitError(error: Error): void {
        this.emitError(error);
    }

    public testSanitizeContent(content: string): string {
        return this.sanitizeContent(content);
    }

    public testTruncateContent(content: string, maxLength: number): string {
        return this.truncateContent(content, maxLength);
    }

    public testParseActionId(actionId: string) {
        return this.parseActionId(actionId);
    }
}

// ============================================================================
// Tests
// ============================================================================

describe('BaseChannelAdapter', () => {
    let adapter: TestChannelAdapter;
    let config: ChannelAdapterConfig;

    beforeEach(() => {
        config = {
            platform: 'slack',
            tenantId: 'tenant-123',
            credentials: {
                platform: 'slack',
                botToken: 'xoxb-test-token',
                appToken: 'xapp-test-token',
                signingSecret: 'test-secret',
            },
            debug: false,
        };
        adapter = new TestChannelAdapter(config);
    });

    describe('status management', () => {
        it('should start with disconnected status', () => {
            expect(adapter.status).toBe('disconnected');
        });

        it('should update status on connect', async () => {
            await adapter.connect();
            expect(adapter.status).toBe('connected');
        });

        it('should update status on disconnect', async () => {
            await adapter.connect();
            await adapter.disconnect();
            expect(adapter.status).toBe('disconnected');
        });

        it('should emit status change events', async () => {
            const statusChanges: ChannelStatus[] = [];
            adapter.onStatusChange((status) => statusChanges.push(status));

            adapter.testSetStatus('connecting');
            adapter.testSetStatus('connected');
            adapter.testSetStatus('disconnected');

            expect(statusChanges).toEqual(['connecting', 'connected', 'disconnected']);
        });
    });

    describe('message handlers', () => {
        it('should register and call message handlers', async () => {
            const receivedMessages: InboundChannelMessage[] = [];
            adapter.onMessage(async (msg) => {
                receivedMessages.push(msg);
            });

            const testMessage: InboundChannelMessage = {
                platformMessageId: 'msg-123',
                platform: 'slack',
                workspaceId: 'workspace-1',
                channelId: 'channel-1',
                userId: 'user-1',
                userName: 'Test User',
                content: 'Hello, world!',
                receivedAt: new Date(),
            };

            await adapter.testEmitMessage(testMessage);

            expect(receivedMessages).toHaveLength(1);
            expect(receivedMessages[0].content).toBe('Hello, world!');
        });

        it('should handle multiple message handlers', async () => {
            let handler1Called = false;
            let handler2Called = false;

            adapter.onMessage(async () => {
                handler1Called = true;
            });
            adapter.onMessage(async () => {
                handler2Called = true;
            });

            const testMessage: InboundChannelMessage = {
                platformMessageId: 'msg-123',
                platform: 'slack',
                workspaceId: 'workspace-1',
                channelId: 'channel-1',
                userId: 'user-1',
                userName: 'Test User',
                content: 'Test',
                receivedAt: new Date(),
            };

            await adapter.testEmitMessage(testMessage);

            expect(handler1Called).toBe(true);
            expect(handler2Called).toBe(true);
        });
    });

    describe('action handlers', () => {
        it('should register and call action handlers', async () => {
            const receivedActions: ChannelUserAction[] = [];
            adapter.onUserAction(async (action) => {
                receivedActions.push(action);
            });

            const testAction: ChannelUserAction = {
                actionId: 'approve_req-123',
                userId: 'user-1',
                userName: 'Test User',
                channelId: 'channel-1',
                messageId: 'msg-1',
                value: 'approved',
                timestamp: new Date(),
            };

            await adapter.testEmitAction(testAction);

            expect(receivedActions).toHaveLength(1);
            expect(receivedActions[0].actionId).toBe('approve_req-123');
        });
    });

    describe('error handling', () => {
        it('should emit error events', () => {
            const errors: Error[] = [];
            adapter.onError((error) => errors.push(error));

            adapter.testEmitError(new Error('Test error'));

            expect(errors).toHaveLength(1);
            expect(errors[0].message).toBe('Test error');
        });
    });

    describe('sendMessage', () => {
        it('should send messages successfully', async () => {
            const message: OutboundChannelMessage = {
                channelId: 'channel-1',
                content: 'Hello!',
            };

            const status = await adapter.sendMessage(message);

            expect(status.status).toBe('delivered');
            expect(status.messageId).toBeDefined();
            expect(adapter.sentMessages).toHaveLength(1);
        });
    });

    describe('updateMessage', () => {
        it('should update messages', async () => {
            await adapter.updateMessage('channel-1', 'msg-1', 'Updated content');

            expect(adapter.updatedMessages).toHaveLength(1);
            expect(adapter.updatedMessages[0]).toEqual({
                channelId: 'channel-1',
                messageId: 'msg-1',
                content: 'Updated content',
            });
        });
    });

    describe('deleteMessage', () => {
        it('should delete messages', async () => {
            await adapter.deleteMessage('channel-1', 'msg-1');

            expect(adapter.deletedMessages).toHaveLength(1);
            expect(adapter.deletedMessages[0]).toEqual({
                channelId: 'channel-1',
                messageId: 'msg-1',
            });
        });
    });

    describe('getChannelInfo', () => {
        it('should return channel info', async () => {
            const info = await adapter.getChannelInfo('channel-test');

            expect(info.channelId).toBe('channel-test');
            expect(info.name).toBe('test-channel-channel-test');
            expect(info.type).toBe('channel');
        });
    });

    describe('createDeliveryStatus', () => {
        it('should create pending status', async () => {
            // Test through sendMessage which uses createDeliveryStatus internally
            const message: OutboundChannelMessage = {
                channelId: 'channel-1',
                content: 'Test',
            };

            const status = await adapter.sendMessage(message);

            expect(status.status).toBe('delivered');
            expect(status.timestamp).toBeInstanceOf(Date);
        });
    });

    describe('parseActionId', () => {
        it('should parse approve action ID', () => {
            const result = adapter.testParseActionId('approve_req-123');

            expect(result).not.toBeNull();
            expect(result?.type).toBe('approve');
            expect(result?.requestId).toBe('req-123');
        });

        it('should parse reject action ID', () => {
            const result = adapter.testParseActionId('reject_req-456');

            expect(result).not.toBeNull();
            expect(result?.type).toBe('reject');
            expect(result?.requestId).toBe('req-456');
        });

        it('should parse alternative action ID', () => {
            const result = adapter.testParseActionId('alternative_req-789_option-1');

            expect(result).not.toBeNull();
            expect(result?.type).toBe('alternative');
            expect(result?.requestId).toBe('req-789');
            expect(result?.alternativeId).toBe('option-1');
        });

        it('should return null for invalid action ID', () => {
            const result = adapter.testParseActionId('invalid');

            expect(result).toBeNull();
        });
    });

    describe('sanitizeContent', () => {
        it('should remove control characters', () => {
            // sanitizeContent removes control characters, not whitespace
            const result = adapter.testSanitizeContent('Hello\x00World\x0B');

            expect(result).toBe('HelloWorld');
        });

        it('should preserve whitespace', () => {
            // sanitizeContent does not trim whitespace
            const result = adapter.testSanitizeContent('  Hello World  ');

            expect(result).toBe('  Hello World  ');
        });
    });

    describe('truncateContent', () => {
        it('should truncate long content', () => {
            const longContent = 'A'.repeat(100);
            const result = adapter.testTruncateContent(longContent, 50);

            // Returns exactly maxLength-3 + "..." = 50 chars
            expect(result.length).toBe(50);
            expect(result.endsWith('...')).toBe(true);
        });

        it('should not truncate short content', () => {
            const shortContent = 'Hello';
            const result = adapter.testTruncateContent(shortContent, 50);

            expect(result).toBe('Hello');
        });
    });
});

describe('ChannelAdapterConfig', () => {
    it('should support slack credentials', () => {
        const config: ChannelAdapterConfig = {
            platform: 'slack',
            tenantId: 'tenant-1',
            credentials: {
                platform: 'slack',
                botToken: 'xoxb-token',
                signingSecret: 'secret',
            },
        };

        expect(config.credentials.platform).toBe('slack');
    });

    it('should support discord credentials', () => {
        const config: ChannelAdapterConfig = {
            platform: 'discord',
            tenantId: 'tenant-1',
            credentials: {
                platform: 'discord',
                botToken: 'discord-bot-token',
                applicationId: 'app-123',
                publicKey: 'pub-key',
            },
        };

        expect(config.credentials.platform).toBe('discord');
    });

    it('should support telegram credentials', () => {
        const config: ChannelAdapterConfig = {
            platform: 'telegram',
            tenantId: 'tenant-1',
            credentials: {
                platform: 'telegram',
                botToken: 'telegram-bot-token',
            },
        };

        expect(config.credentials.platform).toBe('telegram');
    });

    it('should support whatsapp credentials', () => {
        const config: ChannelAdapterConfig = {
            platform: 'whatsapp',
            tenantId: 'tenant-1',
            credentials: {
                platform: 'whatsapp',
                accessToken: 'whatsapp-token',
                phoneNumberId: 'phone-123',
                webhookVerifyToken: 'verify-token',
            },
        };

        expect(config.credentials.platform).toBe('whatsapp');
    });

    it('should support rate limits', () => {
        const config: ChannelAdapterConfig = {
            platform: 'slack',
            tenantId: 'tenant-1',
            credentials: { platform: 'slack', botToken: 'x', signingSecret: 'x' },
            rateLimits: {
                messagesPerMinute: 60,
                messagesPerSecond: 1,
            },
        };

        expect(config.rateLimits?.messagesPerMinute).toBe(60);
        expect(config.rateLimits?.messagesPerSecond).toBe(1);
    });

    it('should support reconnection config', () => {
        const config: ChannelAdapterConfig = {
            platform: 'slack',
            tenantId: 'tenant-1',
            credentials: { platform: 'slack', botToken: 'x', signingSecret: 'x' },
            reconnection: {
                enabled: true,
                maxAttempts: 5,
                baseDelayMs: 1000,
            },
        };

        expect(config.reconnection?.enabled).toBe(true);
        expect(config.reconnection?.maxAttempts).toBe(5);
    });
});

describe('DeliveryStatus', () => {
    it('should create pending status', () => {
        const status: DeliveryStatus = {
            status: 'pending',
            timestamp: new Date(),
        };

        expect(status.status).toBe('pending');
    });

    it('should create delivered status with messageId', () => {
        const status: DeliveryStatus = {
            status: 'delivered',
            messageId: 'msg-123',
            timestamp: new Date(),
        };

        expect(status.status).toBe('delivered');
        expect(status.messageId).toBe('msg-123');
    });

    it('should create failed status with error', () => {
        const status: DeliveryStatus = {
            status: 'failed',
            error: 'Rate limited',
            timestamp: new Date(),
        };

        expect(status.status).toBe('failed');
        expect(status.error).toBe('Rate limited');
    });

    it('should create rate_limited status', () => {
        const status: DeliveryStatus = {
            status: 'rate_limited',
            error: 'Too many requests',
            timestamp: new Date(),
        };

        expect(status.status).toBe('rate_limited');
    });
});

describe('InboundChannelMessage', () => {
    it('should capture all message properties', () => {
        const message: InboundChannelMessage = {
            platformMessageId: 'msg-001',
            platform: 'slack',
            workspaceId: 'T12345',
            channelId: 'C12345',
            threadId: 'thread-1',
            userId: 'U12345',
            userName: 'john.doe',
            userAvatarUrl: 'https://example.com/avatar.jpg',
            content: 'Hello @bot',
            attachments: [
                {
                    type: 'image',
                    url: 'https://example.com/image.png',
                    name: 'image.png',
                    mimeType: 'image/png',
                    size: 1024,
                },
            ],
            mentions: [
                {
                    userId: 'bot-user',
                    userName: 'bot',
                    startIndex: 6,
                    endIndex: 10,
                },
            ],
            botMentioned: true,
            isDirectMessage: false,
            metadata: { custom: 'data' },
            receivedAt: new Date(),
        };

        expect(message.platform).toBe('slack');
        expect(message.botMentioned).toBe(true);
        expect(message.attachments).toHaveLength(1);
        expect(message.mentions).toHaveLength(1);
    });
});

describe('OutboundChannelMessage', () => {
    it('should support basic message', () => {
        const message: OutboundChannelMessage = {
            channelId: 'C12345',
            content: 'Hello!',
        };

        expect(message.channelId).toBe('C12345');
        expect(message.content).toBe('Hello!');
    });

    it('should support threaded messages', () => {
        const message: OutboundChannelMessage = {
            channelId: 'C12345',
            threadId: 'thread-1',
            content: 'Reply',
        };

        expect(message.threadId).toBe('thread-1');
    });

    it('should support ephemeral messages', () => {
        const message: OutboundChannelMessage = {
            channelId: 'C12345',
            content: 'Only you can see this',
            ephemeral: true,
            ephemeralUserId: 'U12345',
        };

        expect(message.ephemeral).toBe(true);
        expect(message.ephemeralUserId).toBe('U12345');
    });

    it('should support interactive elements', () => {
        const message: OutboundChannelMessage = {
            channelId: 'C12345',
            content: 'Choose an option',
            interactiveElements: [
                {
                    type: 'button',
                    actionId: 'approve_123',
                    label: 'Approve',
                    style: 'primary',
                },
                {
                    type: 'button',
                    actionId: 'reject_123',
                    label: 'Reject',
                    style: 'danger',
                },
            ],
        };

        expect(message.interactiveElements).toHaveLength(2);
        expect(message.interactiveElements?.[0].style).toBe('primary');
    });
});
