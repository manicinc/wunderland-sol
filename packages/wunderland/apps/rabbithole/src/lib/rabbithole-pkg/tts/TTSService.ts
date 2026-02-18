/**
 * @fileoverview TTS Service with multi-provider support
 * @module @framers/rabbithole/tts/TTSService
 *
 * Provides text-to-speech synthesis with automatic fallback
 * between providers and optional caching.
 */

import { EventEmitter } from 'eventemitter3';
import type {
  TTSProvider,
  TTSConfig,
  TTSSpeechOptions,
  TTSResult,
  TTSVoice,
  ITTSService,
  TTSManagerConfig,
  TTSEvents,
  OpenAITTSConfig,
  MockTTSConfig,
} from './types.js';
import { DEFAULT_FORMAT_BY_PROVIDER, OPENAI_VOICES } from './types.js';

// ============================================================================
// Base Provider Implementation
// ============================================================================

/**
 * Abstract base class for TTS providers
 */
export abstract class BaseTTSProvider implements ITTSService {
  abstract readonly provider: TTSProvider;

  abstract synthesize(options: TTSSpeechOptions): Promise<TTSResult>;
  abstract listVoices(): Promise<TTSVoice[]>;
  abstract getVoice(voiceId: string): Promise<TTSVoice | null>;
  abstract isAvailable(): Promise<boolean>;
}

// ============================================================================
// OpenAI Provider
// ============================================================================

/**
 * OpenAI TTS provider using the TTS-1 and TTS-1-HD models
 */
export class OpenAITTSProvider extends BaseTTSProvider {
  readonly provider = 'openai' as const;
  private config: OpenAITTSConfig;

  constructor(config: OpenAITTSConfig) {
    super();
    this.config = config;
  }

  async synthesize(options: TTSSpeechOptions): Promise<TTSResult> {
    const startTime = Date.now();
    const format = options.format || DEFAULT_FORMAT_BY_PROVIDER.openai;
    const model = this.config.model || 'tts-1';

    const response = await fetch(this.config.baseUrl || 'https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: options.text,
        voice: options.voiceId,
        response_format: format,
        speed: options.speed || 1.0,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS error: ${response.status} - ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return {
      audio: Buffer.from(audioBuffer),
      format,
      charactersUsed: options.text.length,
      provider: 'openai',
      voiceId: options.voiceId,
      latencyMs: Date.now() - startTime,
    };
  }

  async listVoices(): Promise<TTSVoice[]> {
    return OPENAI_VOICES.map((id) => ({
      id,
      name: id.charAt(0).toUpperCase() + id.slice(1),
      provider: 'openai' as const,
      language: 'en-US',
      gender: this.getVoiceGender(id),
    }));
  }

  private getVoiceGender(voiceId: string): 'male' | 'female' | 'neutral' | undefined {
    const femaleVoices = ['nova', 'shimmer', 'alloy'];
    const maleVoices = ['echo', 'fable', 'onyx'];
    if (femaleVoices.includes(voiceId)) return 'female';
    if (maleVoices.includes(voiceId)) return 'male';
    return 'neutral';
  }

  async getVoice(voiceId: string): Promise<TTSVoice | null> {
    const voices = await this.listVoices();
    return voices.find((v) => v.id === voiceId) || null;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - verify API key format
      return !!this.config.apiKey && this.config.apiKey.startsWith('sk-');
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Mock Provider (for testing)
// ============================================================================

/**
 * Mock TTS provider for testing
 */
export class MockTTSProvider extends BaseTTSProvider {
  readonly provider = 'mock' as const;
  private config: MockTTSConfig;

  constructor(config: MockTTSConfig) {
    super();
    this.config = config;
  }

  async synthesize(options: TTSSpeechOptions): Promise<TTSResult> {
    const startTime = Date.now();

    // Simulate latency
    if (this.config.latencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.latencyMs));
    }

    if (this.config.alwaysFail) {
      throw new Error('Mock TTS provider configured to fail');
    }

    const format = options.format || DEFAULT_FORMAT_BY_PROVIDER.mock;

    // Generate mock audio (1 second of silence in MP3 format)
    const mockAudio = Buffer.from([
      // Minimal valid MP3 frame header
      0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00,
    ]);

    return {
      audio: mockAudio,
      format,
      durationMs: 1000,
      charactersUsed: options.text.length,
      provider: 'mock',
      voiceId: options.voiceId,
      latencyMs: Date.now() - startTime,
    };
  }

  async listVoices(): Promise<TTSVoice[]> {
    return [
      {
        id: 'mock-voice-1',
        name: 'Mock Voice 1',
        provider: 'mock',
        language: 'en-US',
        gender: 'neutral',
      },
      {
        id: 'mock-voice-2',
        name: 'Mock Voice 2',
        provider: 'mock',
        language: 'en-US',
        gender: 'female',
      },
    ];
  }

  async getVoice(voiceId: string): Promise<TTSVoice | null> {
    const voices = await this.listVoices();
    return voices.find((v) => v.id === voiceId) || null;
  }

  async isAvailable(): Promise<boolean> {
    return !this.config.alwaysFail;
  }
}

// ============================================================================
// TTS Service Manager
// ============================================================================

/**
 * TTS service manager with multi-provider support and fallback
 */
export class TTSService extends EventEmitter<TTSEvents> {
  private providers: Map<TTSProvider, ITTSService> = new Map();
  private providerOrder: TTSProvider[] = [];
  private cache: Map<string, TTSResult> = new Map();
  private config: TTSManagerConfig;

  constructor(config: TTSManagerConfig) {
    super();
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Sort by priority (lower = higher priority)
    const sorted = [...this.config.providers].sort((a, b) => a.priority - b.priority);

    for (const { provider, config } of sorted) {
      const service = this.createProvider(config);
      if (service) {
        this.providers.set(provider, service);
        this.providerOrder.push(provider);
      }
    }
  }

  private createProvider(config: TTSConfig): ITTSService | null {
    switch (config.provider) {
      case 'openai':
        return new OpenAITTSProvider(config as OpenAITTSConfig);
      case 'mock':
        return new MockTTSProvider(config as MockTTSConfig);
      // Add more providers as needed
      default:
        return null;
    }
  }

  /**
   * Synthesize speech from text
   */
  async synthesize(options: TTSSpeechOptions): Promise<TTSResult> {
    // Check cache first
    if (this.config.enableCache) {
      const cacheKey = this.getCacheKey(options);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.emit('cache:hit', cacheKey);
        return cached;
      }
      this.emit('cache:miss', cacheKey);
    }

    this.emit('synthesis:start', options);

    let lastError: Error | null = null;

    // Try each provider in order
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const isAvailable = await provider.isAvailable();
        if (!isAvailable) continue;

        const result = await provider.synthesize(options);

        // Cache the result
        if (this.config.enableCache) {
          const cacheKey = this.getCacheKey(options);
          this.cache.set(cacheKey, result);

          // Set TTL for cache cleanup
          if (this.config.cacheTtlSeconds) {
            setTimeout(() => {
              this.cache.delete(cacheKey);
            }, this.config.cacheTtlSeconds * 1000);
          }
        }

        this.emit('synthesis:complete', result);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Emit fallback event if there are more providers
        const currentIndex = this.providerOrder.indexOf(providerName);
        const nextProvider = this.providerOrder[currentIndex + 1];
        if (nextProvider && this.config.enableFallback) {
          this.emit('synthesis:fallback', providerName, nextProvider);
        }
      }
    }

    const finalError = lastError || new Error('No TTS providers available');
    this.emit('synthesis:error', finalError, options);
    throw finalError;
  }

  /**
   * List all available voices across all providers
   */
  async listVoices(): Promise<TTSVoice[]> {
    const allVoices: TTSVoice[] = [];

    for (const provider of this.providers.values()) {
      try {
        const voices = await provider.listVoices();
        allVoices.push(...voices);
      } catch {
        // Skip provider on error
      }
    }

    return allVoices;
  }

  /**
   * List voices for a specific provider
   */
  async listVoicesForProvider(providerName: TTSProvider): Promise<TTSVoice[]> {
    const provider = this.providers.get(providerName);
    if (!provider) return [];
    return provider.listVoices();
  }

  /**
   * Get a specific provider
   */
  getProvider(providerName: TTSProvider): ITTSService | undefined {
    return this.providers.get(providerName);
  }

  /**
   * Check if any provider is available
   */
  async isAvailable(): Promise<boolean> {
    for (const provider of this.providers.values()) {
      if (await provider.isAvailable()) {
        return true;
      }
    }
    return false;
  }

  private getCacheKey(options: TTSSpeechOptions): string {
    // Simple hash-like key
    const parts = [
      options.voiceId,
      options.text,
      options.format || 'default',
      options.speed?.toString() || '1',
      options.pitch?.toString() || '0',
    ];
    return parts.join('|');
  }

  /**
   * Clear the audio cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TTS service with OpenAI as primary provider
 */
export function createOpenAITTSService(apiKey: string): TTSService {
  return new TTSService({
    providers: [
      {
        provider: 'openai',
        priority: 1,
        config: {
          provider: 'openai',
          apiKey,
        },
      },
    ],
    enableFallback: false,
    enableCache: true,
    cacheTtlSeconds: 3600,
    maxTextLength: 4096,
  });
}

/**
 * Create a TTS service with mock provider (for testing)
 */
export function createMockTTSService(options?: {
  latencyMs?: number;
  alwaysFail?: boolean;
}): TTSService {
  return new TTSService({
    providers: [
      {
        provider: 'mock',
        priority: 1,
        config: {
          provider: 'mock',
          latencyMs: options?.latencyMs,
          alwaysFail: options?.alwaysFail,
        },
      },
    ],
    enableFallback: false,
    enableCache: false,
  });
}
