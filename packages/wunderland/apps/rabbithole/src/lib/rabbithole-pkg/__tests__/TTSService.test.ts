/**
 * @fileoverview Unit tests for TTS Service
 * @module @framers/rabbithole/tts/__tests__
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    TTSService,
    MockTTSProvider,
    OpenAITTSProvider,
    createMockTTSService,
    createOpenAITTSService,
} from '../tts/TTSService.js';
import type {
    TTSSpeechOptions,
    TTSVoice,
    TTSResult,
    TTSManagerConfig,
    TTSProvider,
} from '../tts/types.js';
import {
    OPENAI_VOICES,
    EDGE_TTS_VOICES,
    DEFAULT_FORMAT_BY_PROVIDER,
} from '../tts/types.js';

// ============================================================================
// Constants Tests
// ============================================================================

describe('TTS Constants', () => {
    describe('OPENAI_VOICES', () => {
        it('should contain expected voices', () => {
            expect(OPENAI_VOICES).toContain('alloy');
            expect(OPENAI_VOICES).toContain('echo');
            expect(OPENAI_VOICES).toContain('nova');
            expect(OPENAI_VOICES.length).toBe(6);
        });
    });

    describe('EDGE_TTS_VOICES', () => {
        it('should contain neural voices', () => {
            expect(EDGE_TTS_VOICES).toContain('en-US-AriaNeural');
            expect(EDGE_TTS_VOICES.length).toBeGreaterThan(0);
        });
    });

    describe('DEFAULT_FORMAT_BY_PROVIDER', () => {
        it('should have mp3 as default for most providers', () => {
            expect(DEFAULT_FORMAT_BY_PROVIDER.openai).toBe('mp3');
            expect(DEFAULT_FORMAT_BY_PROVIDER.elevenlabs).toBe('mp3');
            expect(DEFAULT_FORMAT_BY_PROVIDER.edge).toBe('mp3');
        });

        it('should have pcm for browser provider', () => {
            expect(DEFAULT_FORMAT_BY_PROVIDER.browser).toBe('pcm');
        });
    });
});

// ============================================================================
// MockTTSProvider Tests
// ============================================================================

describe('MockTTSProvider', () => {
    let provider: MockTTSProvider;

    beforeEach(() => {
        provider = new MockTTSProvider({ provider: 'mock' });
    });

    describe('synthesize', () => {
        it('should return mock audio data', async () => {
            const options: TTSSpeechOptions = {
                voiceId: 'mock-voice-1',
                text: 'Hello, world!',
            };

            const result = await provider.synthesize(options);

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.format).toBe('mp3');
            expect(result.provider).toBe('mock');
            expect(result.voiceId).toBe('mock-voice-1');
            expect(result.charactersUsed).toBe(13);
            expect(result.latencyMs).toBeGreaterThanOrEqual(0);
        });

        it('should simulate latency when configured', async () => {
            const providerWithLatency = new MockTTSProvider({
                provider: 'mock',
                latencyMs: 100,
            });

            const startTime = Date.now();
            await providerWithLatency.synthesize({
                voiceId: 'mock-voice-1',
                text: 'Test',
            });
            const elapsed = Date.now() - startTime;

            expect(elapsed).toBeGreaterThanOrEqual(100);
        });

        it('should throw when alwaysFail is true', async () => {
            const failingProvider = new MockTTSProvider({
                provider: 'mock',
                alwaysFail: true,
            });

            await expect(
                failingProvider.synthesize({
                    voiceId: 'mock-voice-1',
                    text: 'Test',
                }),
            ).rejects.toThrow('Mock TTS provider configured to fail');
        });
    });

    describe('listVoices', () => {
        it('should return mock voices', async () => {
            const voices = await provider.listVoices();

            expect(voices.length).toBe(2);
            expect(voices[0].id).toBe('mock-voice-1');
            expect(voices[0].provider).toBe('mock');
        });
    });

    describe('getVoice', () => {
        it('should return voice by ID', async () => {
            const voice = await provider.getVoice('mock-voice-1');

            expect(voice).not.toBeNull();
            expect(voice?.id).toBe('mock-voice-1');
        });

        it('should return null for unknown voice', async () => {
            const voice = await provider.getVoice('unknown-voice');

            expect(voice).toBeNull();
        });
    });

    describe('isAvailable', () => {
        it('should return true by default', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false when alwaysFail is set', async () => {
            const failingProvider = new MockTTSProvider({
                provider: 'mock',
                alwaysFail: true,
            });

            expect(await failingProvider.isAvailable()).toBe(false);
        });
    });
});

// ============================================================================
// OpenAITTSProvider Tests
// ============================================================================

describe('OpenAITTSProvider', () => {
    let provider: OpenAITTSProvider;

    beforeEach(() => {
        provider = new OpenAITTSProvider({
            provider: 'openai',
            apiKey: 'sk-test-key',
        });
    });

    describe('listVoices', () => {
        it('should return OpenAI voices with metadata', async () => {
            const voices = await provider.listVoices();

            expect(voices.length).toBe(6);
            expect(voices.find((v) => v.id === 'alloy')).toBeDefined();
            expect(voices.find((v) => v.id === 'nova')).toBeDefined();
            expect(voices[0].provider).toBe('openai');
            expect(voices[0].language).toBe('en-US');
        });

        it('should include gender information', async () => {
            const voices = await provider.listVoices();
            const nova = voices.find((v) => v.id === 'nova');
            const echo = voices.find((v) => v.id === 'echo');

            expect(nova?.gender).toBe('female');
            expect(echo?.gender).toBe('male');
        });
    });

    describe('getVoice', () => {
        it('should return voice by ID', async () => {
            const voice = await provider.getVoice('alloy');

            expect(voice).not.toBeNull();
            expect(voice?.id).toBe('alloy');
        });

        it('should return null for unknown voice', async () => {
            const voice = await provider.getVoice('not-a-voice');

            expect(voice).toBeNull();
        });
    });

    describe('isAvailable', () => {
        it('should return true for valid API key format', async () => {
            expect(await provider.isAvailable()).toBe(true);
        });

        it('should return false for invalid API key', async () => {
            const badProvider = new OpenAITTSProvider({
                provider: 'openai',
                apiKey: 'invalid-key',
            });

            expect(await badProvider.isAvailable()).toBe(false);
        });
    });
});

// ============================================================================
// TTSService Tests
// ============================================================================

describe('TTSService', () => {
    let service: TTSService;
    let config: TTSManagerConfig;

    beforeEach(() => {
        config = {
            providers: [
                {
                    provider: 'mock',
                    priority: 1,
                    config: { provider: 'mock' },
                },
            ],
            enableFallback: true,
            enableCache: true,
            cacheTtlSeconds: 60,
            maxTextLength: 4096,
        };
        service = new TTSService(config);
    });

    describe('synthesize', () => {
        it('should synthesize audio successfully', async () => {
            const result = await service.synthesize({
                voiceId: 'mock-voice-1',
                text: 'Hello, world!',
            });

            expect(result.audio).toBeInstanceOf(Buffer);
            expect(result.provider).toBe('mock');
            expect(result.voiceId).toBe('mock-voice-1');
        });

        it('should emit synthesis events', async () => {
            const events: string[] = [];

            service.on('synthesis:start', () => events.push('start'));
            service.on('synthesis:complete', () => events.push('complete'));

            await service.synthesize({
                voiceId: 'mock-voice-1',
                text: 'Test',
            });

            expect(events).toEqual(['start', 'complete']);
        });

        it('should use cache on second request', async () => {
            const options: TTSSpeechOptions = {
                voiceId: 'mock-voice-1',
                text: 'Cached text',
            };

            const cacheEvents: string[] = [];
            service.on('cache:miss', () => cacheEvents.push('miss'));
            service.on('cache:hit', () => cacheEvents.push('hit'));

            // First request - cache miss
            await service.synthesize(options);

            // Second request - cache hit
            await service.synthesize(options);

            expect(cacheEvents).toEqual(['miss', 'hit']);
        });
    });

    describe('fallback', () => {
        it('should fallback to secondary provider on failure', async () => {
            const multiProviderConfig: TTSManagerConfig = {
                providers: [
                    {
                        provider: 'mock',
                        priority: 1,
                        config: { provider: 'mock', alwaysFail: true },
                    },
                    {
                        provider: 'mock',
                        priority: 2,
                        config: { provider: 'mock' }, // This one works
                    },
                ],
                enableFallback: true,
                enableCache: false,
            };

            const multiService = new TTSService(multiProviderConfig);

            // Note: Both are 'mock' so the fallback won't be distinguishable by provider name,
            // but the service should still succeed on the second attempt
            // For this test we'll just verify it doesn't throw
            const result = await multiService.synthesize({
                voiceId: 'mock-voice-1',
                text: 'Fallback test',
            });

            expect(result.provider).toBe('mock');
        });

        it('should throw when all providers fail', async () => {
            const failingConfig: TTSManagerConfig = {
                providers: [
                    {
                        provider: 'mock',
                        priority: 1,
                        config: { provider: 'mock', alwaysFail: true },
                    },
                ],
                enableFallback: true,
                enableCache: false,
            };

            const failingService = new TTSService(failingConfig);

            await expect(
                failingService.synthesize({
                    voiceId: 'mock-voice-1',
                    text: 'Test',
                }),
            ).rejects.toThrow();
        });
    });

    describe('listVoices', () => {
        it('should list voices from all providers', async () => {
            const voices = await service.listVoices();

            expect(voices.length).toBeGreaterThan(0);
            expect(voices[0].provider).toBe('mock');
        });
    });

    describe('listVoicesForProvider', () => {
        it('should list voices for specific provider', async () => {
            const voices = await service.listVoicesForProvider('mock');

            expect(voices.length).toBe(2);
        });

        it('should return empty array for unknown provider', async () => {
            const voices = await service.listVoicesForProvider(
                'unknown' as TTSProvider,
            );

            expect(voices).toEqual([]);
        });
    });

    describe('isAvailable', () => {
        it('should return true when provider is available', async () => {
            expect(await service.isAvailable()).toBe(true);
        });

        it('should return false when no providers available', async () => {
            const noProviderService = new TTSService({
                providers: [],
                enableFallback: false,
                enableCache: false,
            });

            expect(await noProviderService.isAvailable()).toBe(false);
        });
    });

    describe('cache management', () => {
        it('should track cache stats', async () => {
            await service.synthesize({
                voiceId: 'mock-voice-1',
                text: 'Cached item 1',
            });
            await service.synthesize({
                voiceId: 'mock-voice-2',
                text: 'Cached item 2',
            });

            const stats = service.getCacheStats();

            expect(stats.size).toBe(2);
        });

        it('should clear cache', async () => {
            await service.synthesize({
                voiceId: 'mock-voice-1',
                text: 'To be cleared',
            });

            service.clearCache();

            expect(service.getCacheStats().size).toBe(0);
        });
    });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('Factory Functions', () => {
    describe('createMockTTSService', () => {
        it('should create mock service with defaults', () => {
            const service = createMockTTSService();

            expect(service).toBeInstanceOf(TTSService);
        });

        it('should create mock service with options', () => {
            const service = createMockTTSService({ latencyMs: 50 });

            expect(service).toBeInstanceOf(TTSService);
        });
    });

    describe('createOpenAITTSService', () => {
        it('should create OpenAI service', () => {
            const service = createOpenAITTSService('sk-test-key');

            expect(service).toBeInstanceOf(TTSService);
        });
    });
});

// ============================================================================
// Type Tests
// ============================================================================

describe('TTSVoice type', () => {
    it('should have required properties', () => {
        const voice: TTSVoice = {
            id: 'test-voice',
            name: 'Test Voice',
            provider: 'mock',
            language: 'en-US',
        };

        expect(voice.id).toBe('test-voice');
        expect(voice.provider).toBe('mock');
    });

    it('should support optional properties', () => {
        const voice: TTSVoice = {
            id: 'test-voice',
            name: 'Test Voice',
            provider: 'openai',
            language: 'en-US',
            gender: 'female',
            description: 'A test voice',
            previewUrl: 'https://example.com/preview.mp3',
            metadata: { custom: 'data' },
        };

        expect(voice.gender).toBe('female');
        expect(voice.previewUrl).toBeDefined();
    });
});

describe('TTSResult type', () => {
    it('should have required properties', () => {
        const result: TTSResult = {
            audio: Buffer.from([]),
            format: 'mp3',
            charactersUsed: 100,
            provider: 'openai',
            voiceId: 'alloy',
            latencyMs: 500,
        };

        expect(result.format).toBe('mp3');
        expect(result.charactersUsed).toBe(100);
    });

    it('should support optional durationMs', () => {
        const result: TTSResult = {
            audio: Buffer.from([]),
            format: 'mp3',
            durationMs: 5000,
            charactersUsed: 100,
            provider: 'mock',
            voiceId: 'mock-voice',
            latencyMs: 50,
        };

        expect(result.durationMs).toBe(5000);
    });
});
