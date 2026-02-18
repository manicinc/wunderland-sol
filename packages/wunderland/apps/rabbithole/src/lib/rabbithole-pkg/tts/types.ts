/**
 * @fileoverview Text-to-Speech Types for RabbitHole
 * @module @framers/rabbithole/tts/types
 *
 * Defines types for TTS providers supporting multiple backends
 * (OpenAI, ElevenLabs, Google, Edge-TTS, etc.)
 */

// ============================================================================
// Provider Types
// ============================================================================

/** Supported TTS providers */
export type TTSProvider =
    | 'openai'
    | 'elevenlabs'
    | 'google'
    | 'edge'
    | 'browser'
    | 'mock';

/** Audio output format */
export type TTSAudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

/** Audio quality/speed tier */
export type TTSQualityTier = 'low' | 'standard' | 'hd';

// ============================================================================
// Voice Configuration
// ============================================================================

/** Voice characteristics */
export interface TTSVoice {
    /** Unique voice identifier */
    id: string;

    /** Display name */
    name: string;

    /** Provider this voice belongs to */
    provider: TTSProvider;

    /** Language code (e.g., 'en-US') */
    language: string;

    /** Voice gender */
    gender?: 'male' | 'female' | 'neutral';

    /** Voice description */
    description?: string;

    /** Preview audio URL */
    previewUrl?: string;

    /** Provider-specific metadata */
    metadata?: Record<string, unknown>;
}

/** Speech generation options */
export interface TTSSpeechOptions {
    /** Voice ID to use */
    voiceId: string;

    /** Text to synthesize */
    text: string;

    /** Output format */
    format?: TTSAudioFormat;

    /** Speed multiplier (0.25 to 4.0) */
    speed?: number;

    /** Pitch adjustment (-20 to 20 semitones) */
    pitch?: number;

    /** Quality tier */
    quality?: TTSQualityTier;

    /** SSML input (if supported) */
    ssml?: boolean;
}

// ============================================================================
// Provider Configuration
// ============================================================================

/** Base provider configuration */
export interface TTSProviderConfig {
    /** Provider type */
    provider: TTSProvider;

    /** API key or token */
    apiKey?: string;

    /** Custom API base URL */
    baseUrl?: string;

    /** Request timeout in ms */
    timeoutMs?: number;

    /** Rate limit (requests per minute) */
    rateLimitRpm?: number;

    /** Enable debug logging */
    debug?: boolean;
}

/** OpenAI TTS configuration */
export interface OpenAITTSConfig extends TTSProviderConfig {
    provider: 'openai';
    apiKey: string;
    /** Model: 'tts-1' or 'tts-1-hd' */
    model?: 'tts-1' | 'tts-1-hd';
}

/** ElevenLabs TTS configuration */
export interface ElevenLabsConfig extends TTSProviderConfig {
    provider: 'elevenlabs';
    apiKey: string;
    /** Model ID */
    modelId?: string;
    /** Stability (0.0 to 1.0) */
    stability?: number;
    /** Similarity boost (0.0 to 1.0) */
    similarityBoost?: number;
}

/** Edge TTS configuration (free, Microsoft Edge voices) */
export interface EdgeTTSConfig extends TTSProviderConfig {
    provider: 'edge';
    /** Voice short name (e.g., 'en-US-AriaNeural') */
    defaultVoice?: string;
}

/** Browser Web Speech API configuration */
export interface BrowserTTSConfig extends TTSProviderConfig {
    provider: 'browser';
    /** Use remote synthesis when available */
    preferRemote?: boolean;
}

/** Mock provider for testing */
export interface MockTTSConfig extends TTSProviderConfig {
    provider: 'mock';
    /** Simulated latency in ms */
    latencyMs?: number;
    /** Always return error */
    alwaysFail?: boolean;
}

/** Union of all provider configs */
export type TTSConfig =
    | OpenAITTSConfig
    | ElevenLabsConfig
    | EdgeTTSConfig
    | BrowserTTSConfig
    | MockTTSConfig;

// ============================================================================
// Service Interface
// ============================================================================

/** TTS generation result */
export interface TTSResult {
    /** Audio data (Buffer on server, ArrayBuffer in browser) */
    audio: Buffer | ArrayBuffer;

    /** Audio format */
    format: TTSAudioFormat;

    /** Duration in milliseconds (if known) */
    durationMs?: number;

    /** Characters consumed */
    charactersUsed: number;

    /** Provider used */
    provider: TTSProvider;

    /** Voice ID used */
    voiceId: string;

    /** Request latency in ms */
    latencyMs: number;
}

/** TTS streaming chunk */
export interface TTSStreamChunk {
    /** Audio chunk data */
    data: Buffer | ArrayBuffer;

    /** Chunk index */
    index: number;

    /** Is this the final chunk? */
    isFinal: boolean;
}

/** TTS service interface */
export interface ITTSService {
    /** Provider identifier */
    readonly provider: TTSProvider;

    /**
     * Generate speech audio from text
     */
    synthesize(options: TTSSpeechOptions): Promise<TTSResult>;

    /**
     * Stream speech audio from text (if supported)
     */
    synthesizeStream?(
        options: TTSSpeechOptions,
    ): AsyncIterable<TTSStreamChunk>;

    /**
     * List available voices
     */
    listVoices(): Promise<TTSVoice[]>;

    /**
     * Get a specific voice by ID
     */
    getVoice(voiceId: string): Promise<TTSVoice | null>;

    /**
     * Check if provider is available
     */
    isAvailable(): Promise<boolean>;

    /**
     * Get usage/quota information
     */
    getUsage?(): Promise<{
        used: number;
        limit: number;
        resetAt?: Date;
    }>;
}

// ============================================================================
// Service Manager Types
// ============================================================================

/** TTS service priority for fallback */
export interface TTSProviderPriority {
    provider: TTSProvider;
    priority: number; // Lower = higher priority
    config: TTSConfig;
}

/** TTS manager configuration */
export interface TTSManagerConfig {
    /** Ordered list of providers (first = preferred) */
    providers: TTSProviderPriority[];

    /** Enable automatic fallback on failure */
    enableFallback?: boolean;

    /** Cache synthesized audio */
    enableCache?: boolean;

    /** Cache TTL in seconds */
    cacheTtlSeconds?: number;

    /** Maximum text length per request */
    maxTextLength?: number;
}

// ============================================================================
// Events
// ============================================================================

/** TTS event types */
export interface TTSEvents {
    'synthesis:start': (options: TTSSpeechOptions) => void;
    'synthesis:complete': (result: TTSResult) => void;
    'synthesis:error': (error: Error, options: TTSSpeechOptions) => void;
    'synthesis:fallback': (from: TTSProvider, to: TTSProvider) => void;
    'cache:hit': (hash: string) => void;
    'cache:miss': (hash: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

/** Default OpenAI voices */
export const OPENAI_VOICES = [
    'alloy',
    'echo',
    'fable',
    'onyx',
    'nova',
    'shimmer',
] as const;

/** Default Edge TTS voices (subset) */
export const EDGE_TTS_VOICES = [
    'en-US-AriaNeural',
    'en-US-GuyNeural',
    'en-US-JennyNeural',
    'en-GB-SoniaNeural',
    'en-AU-NatashaNeural',
] as const;

/** Default format by provider */
export const DEFAULT_FORMAT_BY_PROVIDER: Record<TTSProvider, TTSAudioFormat> = {
    openai: 'mp3',
    elevenlabs: 'mp3',
    google: 'mp3',
    edge: 'mp3',
    browser: 'pcm',
    mock: 'mp3',
};
